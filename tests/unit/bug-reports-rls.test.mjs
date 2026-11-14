// Cloud rules for bug reports (supabase/migrations/0003): signed-in users can
// file reports and upload attachments into their own folder; nobody can read,
// change or delete reports through the API. Real Postgres (PGlite).
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createSupabase, applyMigration, as } from './supabase-harness.mjs';

const OWNER_A = randomUUID();
const OWNER_B = randomUUID();
const CLINIC_A = randomUUID();
const CLINIC_B = randomUUID();
const now = () => new Date().toISOString();

let pg;
const q = (uid, sql, params) => as(pg, uid, (query) => query(sql, params));
const report = (uid, extra = {}) => q(uid,
  'insert into public.bug_reports (id, clinic_id, description, reporter_auth_id) values ($1, $2, $3, coalesce($4, auth.uid()))',
  [extra.id || randomUUID(), extra.clinic_id ?? null, extra.description ?? 'Calendar froze', extra.reporter ?? null]);
const upload = (uid, name) => q(uid, `insert into storage.objects (bucket_id, name) values ('bug-reports', $1)`, [name]);

async function clinic(owner, id) {
  await q(owner, 'insert into public.clinics (id, created_at, updated_at, name) values ($1, $2, $2, $3)', [id, now(), 'C']);
  await q(owner, `insert into public.users (id, created_at, updated_at, clinic_id, first_name, last_name, email, auth_user_id, is_clinic_owner)
                  values ($1, $2, $2, $3, 'U', 'X', 'u@x', $4, 1)`, [randomUUID(), now(), id, owner]);
}

before(async () => {
  pg = await createSupabase();
  await clinic(OWNER_A, CLINIC_A);
  await clinic(OWNER_B, CLINIC_B);
});

test('a signed-in member can file a report for their clinic, or without a clinic', async () => {
  await report(OWNER_A, { clinic_id: CLINIC_A });
  await report(OWNER_A);
  const rows = (await pg.query('select reporter_auth_id from public.bug_reports')).rows;
  assert.ok(rows.length >= 2 && rows.every((r) => r.reporter_auth_id));
});

test('nobody can read, change or delete reports — not even the reporter', async () => {
  const id = randomUUID();
  await report(OWNER_A, { id, clinic_id: CLINIC_A });
  await assert.rejects(q(OWNER_A, 'select * from public.bug_reports'), /permission denied/);
  await assert.rejects(q(OWNER_A, `update public.bug_reports set description = 'x' where id = $1`, [id]), /permission denied/);
  await assert.rejects(q(OWNER_A, 'delete from public.bug_reports where id = $1', [id]), /permission denied/);
  await assert.rejects(q(null, 'select * from public.bug_reports'), /permission denied/);
});

test('signed-out requests cannot file reports', async () => {
  await assert.rejects(report(null), /permission denied|row-level security/);
});

test("a report can't be filed under another clinic or another person's name", async () => {
  await assert.rejects(report(OWNER_A, { clinic_id: CLINIC_B }), /row-level security/);
  await assert.rejects(report(OWNER_A, { reporter: OWNER_B }), /row-level security/);
});

test('reports are bounded in size', async () => {
  await assert.rejects(report(OWNER_A, { description: '' }), /check constraint/);
  await assert.rejects(report(OWNER_A, { description: 'x'.repeat(10001) }), /check constraint/);
});

test('attachments: upload into your own folder only, never read back', async () => {
  const reportId = randomUUID();
  await upload(OWNER_A, `${OWNER_A}/${reportId}/0-screenshot.png`);
  await assert.rejects(upload(OWNER_A, `${OWNER_B}/${reportId}/0-x.png`), /row-level security/);
  await assert.rejects(upload(OWNER_A, 'loose-file.png'), /row-level security/);
  await assert.rejects(upload(null, `${OWNER_A}/${reportId}/1-x.png`), /row-level security/);
  assert.equal((await q(OWNER_A, 'select * from storage.objects')).rows.length, 0);
  // Other buckets are untouched by these rules.
  await pg.query(`insert into storage.buckets (id, name) values ('other', 'other')`);
  await assert.rejects(q(OWNER_A, `insert into storage.objects (bucket_id, name) values ('other', $1)`, [`${OWNER_A}/x`]), /row-level security/);
});

test('the migration is idempotent and keeps the bucket private', async () => {
  await applyMigration(pg, '0003');
  await pg.query(`update storage.buckets set public = true where id = 'bug-reports'`);
  await applyMigration(pg, '0003');
  const [bucket] = (await pg.query(`select public, file_size_limit from storage.buckets where id = 'bug-reports'`)).rows;
  assert.equal(bucket.public, false);
  assert.equal(Number(bucket.file_size_limit), 10 * 1024 * 1024);
  await report(OWNER_A, { clinic_id: CLINIC_A });
});
