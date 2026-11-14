// A local stand-in for the Supabase project: real Postgres (PGlite, WASM)
// with Supabase's auth.uid(), anon/authenticated roles and default grants,
// and the project's real migrations applied. Queries run as a given auth
// user so Row Level Security is enforced exactly as it would be in the cloud.
import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const MIGRATIONS = path.join(ROOT, 'supabase', 'migrations');

const SUPABASE_BOOTSTRAP = `
  create role anon nologin;
  create role authenticated nologin;
  create schema auth;
  grant usage on schema auth to anon, authenticated;
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  grant usage on schema public to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant all on functions to anon, authenticated;

  -- Supabase Storage, reduced to what the policies use.
  create schema storage;
  grant usage on schema storage to anon, authenticated;
  create table storage.buckets (
    id text primary key, name text not null, public boolean default false,
    file_size_limit bigint, allowed_mime_types text[]
  );
  create table storage.objects (
    id uuid primary key default gen_random_uuid(),
    bucket_id text references storage.buckets(id), name text not null,
    owner uuid default auth.uid(), unique (bucket_id, name)
  );
  alter table storage.objects enable row level security;
  grant all on storage.objects to anon, authenticated;
  create function storage.foldername(name text) returns text[] language sql immutable as $$
    select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1]
  $$;
  grant execute on function storage.foldername(text) to anon, authenticated;
`;

const ALL_MIGRATIONS = fs.readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort().map((f) => f.slice(0, 4));

export async function createSupabase({ migrations = ALL_MIGRATIONS } = {}) {
  const pg = new PGlite();
  await pg.exec(SUPABASE_BOOTSTRAP);
  for (const prefix of migrations) {
    const file = fs.readdirSync(MIGRATIONS).find((f) => f.startsWith(prefix));
    await pg.exec(fs.readFileSync(path.join(MIGRATIONS, file), 'utf8'));
  }
  return pg;
}

export const applyMigration = async (pg, prefix) => {
  const file = fs.readdirSync(MIGRATIONS).find((f) => f.startsWith(prefix));
  await pg.exec(fs.readFileSync(path.join(MIGRATIONS, file), 'utf8'));
};

// Run fn(query) as an authenticated user (uid) or as anon (uid = null).
// Serialized: PGlite has a single session.
let chain = Promise.resolve();
export function as(pg, uid, fn) {
  const run = async () => {
    await pg.exec(uid ? 'set role authenticated' : 'set role anon');
    await pg.query(`select set_config('request.jwt.claim.sub', $1, false)`, [uid || '']);
    try {
      return await fn((sql, params) => pg.query(sql, params));
    } finally {
      await pg.exec('reset role');
      await pg.query(`select set_config('request.jwt.claim.sub', '', false)`);
    }
  };
  const p = chain.then(run, run);
  chain = p.catch(() => {});
  return p;
}

// Convert a PGlite row to the JSON PostgREST would return.
const NUMERIC = 1700;
const TIMESTAMPTZ = 1184;
const toJson = (result) => result.rows.map((row) => {
  const out = {};
  for (const f of result.fields) {
    const v = row[f.name];
    if (v instanceof Date) out[f.name] = v.toISOString().replace('Z', '+00:00');
    else if (f.dataTypeID === NUMERIC && v !== null) out[f.name] = Number(v);
    else out[f.name] = v;
  }
  return out;
});

// The sync engine's remote interface, backed by PGlite as `uid`.
export function remoteAs(pg, uid) {
  return {
    // PostgREST bulk upsert: one statement, all-or-nothing.
    async upsert(table, rows) {
      if (!rows.length) return { error: null };
      const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))];
      const params = [];
      const values = rows.map((r) => `(${cols.map((c) => { params.push(r[c] ?? null); return `$${params.length}`; }).join(',')})`);
      const sql = `insert into public.${table} (${cols.join(',')}) values ${values.join(',')}
        on conflict (id) do update set ${cols.filter((c) => c !== 'id').map((c) => `${c}=excluded.${c}`).join(',')}`;
      try {
        await as(pg, uid, (q) => q(sql, params));
        return { error: null };
      } catch (e) {
        return { error: { message: e.message } };
      }
    },
    // Keyset page of rows changed after (afterTs, afterId), oldest first.
    async page(table, { afterTs, afterId, limit }) {
      try {
        const res = await as(pg, uid, (q) => afterTs
          ? q(`select * from public.${table}
               where server_updated_at > $1 or (server_updated_at = $1 and id > $2)
               order by server_updated_at, id limit $3`, [afterTs, afterId || '00000000-0000-0000-0000-000000000000', limit])
          : q(`select * from public.${table} order by server_updated_at, id limit $1`, [limit]));
        return { rows: toJson(res), error: null };
      } catch (e) {
        return { rows: [], error: { message: e.message } };
      }
    },
  };
}
