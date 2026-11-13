// Two-way sync between simulated devices: each has its own local SQLite (the
// app's real schema via db.migrate) and syncs through a real Postgres with
// the real cloud migrations and access rules (PGlite).
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { createSupabase, remoteAs } from './supabase-harness.mjs';
import { createSyncEngine } from '../../src/lib/sync-core.js';

const require = createRequire(import.meta.url);
const initSqlJs = require('sql.js');
const { migrate } = require('../../db.js');
const SQL = await initSqlJs();

// A device: local DB + sync engine signed in as `uid`.
function device(pg, uid, opts = {}) {
  const d = new SQL.Database();
  migrate(d);
  const local = {
    all: async (sql, params = []) => {
      const stmt = d.prepare(sql);
      stmt.bind(params);
      const rows = [];
      while (stmt.step()) rows.push(stmt.getAsObject());
      stmt.free();
      return rows;
    },
    run: async (sql, params = []) => { d.run(sql, params); },
  };
  const remote = opts.remote ? opts.remote(remoteAs(pg, uid), local) : remoteAs(pg, uid);
  const engine = createSyncEngine({ local, remote, pageSize: opts.pageSize || 500 });
  const at = (offsetMs = 0) => new Date(Date.now() + offsetMs).toISOString();
  return {
    local, engine,
    insert: async (table, fields, updatedAt = at()) => {
      const row = { id: randomUUID(), created_at: updatedAt, updated_at: updatedAt, sync_status: 'pending', ...fields };
      const cols = Object.keys(row);
      d.run(`INSERT INTO ${table} (${cols}) VALUES (${cols.map(() => '?')})`, cols.map((c) => row[c]));
      return row;
    },
    edit: (table, id, patch, updatedAt = at()) => {
      const f = { ...patch, updated_at: updatedAt, sync_status: 'pending' };
      d.run(`UPDATE ${table} SET ${Object.keys(f).map((c) => `${c}=?`)} WHERE id=?`, [...Object.values(f), id]);
    },
    one: async (sql, params) => (await local.all(sql, params))[0],
    count: async (table) => (await local.all(`SELECT COUNT(*) n FROM ${table}`))[0].n,
  };
}

// The owner creating a clinic on their first device (what sign-up does).
async function provision(dev, ownerUid) {
  const clinic = await dev.insert('clinics', { name: 'Cabinet', locale: 'fr-TN', currency: 'TND' });
  const user = await dev.insert('users', {
    clinic_id: clinic.id, first_name: 'Karim', last_name: 'B', email: 'k@b', auth_user_id: ownerUid, is_clinic_owner: 1,
  });
  return { clinic, user };
}
const patient = (dev, clinicId, last, updatedAt) => dev.insert('patients', {
  clinic_id: clinicId, first_name: 'P', last_name: last, date_of_birth: '1990-01-01', phone: '1',
}, updatedAt);

let pg;
beforeEach(async () => { pg = await createSupabase(); });

test('a fresh device downloads the whole clinic, with normalized timestamps', async () => {
  const owner = randomUUID();
  const pc1 = device(pg, owner);
  const { clinic } = await provision(pc1, owner);
  await patient(pc1, clinic.id, 'Ben Salah');
  await pc1.insert('appointments', {
    clinic_id: clinic.id, patient_id: randomUUID(), assigned_user_id: randomUUID(),
    start_time: '2026-11-14T09:00:00.000Z', end_time: '2026-11-14T10:00:00.000Z', status: 'scheduled',
  });
  const r1 = await pc1.engine.sync();
  assert.deepEqual(r1.errors, []);
  assert.equal(await pc1.engine.pendingCount(), 0);

  const pc2 = device(pg, owner);
  const r2 = await pc2.engine.sync();
  assert.deepEqual(r2.errors, []);
  assert.equal(await pc2.count('patients'), 1);
  assert.equal(await pc2.count('users'), 1);
  const appt = await pc2.one('SELECT start_time, sync_status, clinic_id FROM appointments');
  assert.equal(appt.start_time, '2026-11-14T09:00:00.000Z'); // same format the app range-queries with
  assert.equal(appt.sync_status, 'synced');
  assert.equal(appt.clinic_id, clinic.id);
  assert.equal(await pc2.engine.pendingCount(), 0);
});

test('concurrent edits: the newest edit wins on every device, whatever the push order', async () => {
  const owner = randomUUID();
  const pc1 = device(pg, owner);
  const { clinic } = await provision(pc1, owner);
  const p = await patient(pc1, clinic.id, 'Original');
  await pc1.engine.sync();
  const pc2 = device(pg, owner);
  await pc2.engine.sync();

  const later = (min) => new Date(Date.now() + min * 60_000).toISOString();
  pc1.edit('patients', p.id, { last_name: 'Older edit' }, later(1));
  pc2.edit('patients', p.id, { last_name: 'Newer edit' }, later(2));
  await pc2.engine.sync(); // newer pushed first
  await pc1.engine.sync(); // older pushed last — must not overwrite
  await pc2.engine.sync();

  for (const pc of [pc1, pc2]) {
    const row = await pc.one('SELECT last_name, sync_status FROM patients WHERE id=?', [p.id]);
    assert.deepEqual(row, { last_name: 'Newer edit', sync_status: 'synced' });
  }
});

test('a newer pending local edit is not overwritten by an older server version', async () => {
  const owner = randomUUID();
  const pc1 = device(pg, owner);
  const { clinic } = await provision(pc1, owner);
  const p = await patient(pc1, clinic.id, 'Server');
  await pc1.engine.sync();
  pc1.edit('patients', p.id, { last_name: 'Local newer' }, new Date(Date.now() + 60_000).toISOString());
  await pc1.engine.pull();
  assert.deepEqual(await pc1.one('SELECT last_name, sync_status FROM patients WHERE id=?', [p.id]),
    { last_name: 'Local newer', sync_status: 'pending' });
});

test('an edit made while its push is in flight stays pending (no lost update)', async () => {
  const owner = randomUUID();
  let pcRef;
  const pc = device(pg, owner, {
    remote: (real) => ({
      ...real,
      async upsert(table, rows) {
        const res = await real.upsert(table, rows);
        // User edits the patient while the request is on the wire.
        if (table === 'patients') pcRef.edit('patients', rows[0].id, { last_name: 'Edited mid-push' });
        return res;
      },
    }),
  });
  pcRef = pc;
  const { clinic } = await provision(pc, owner);
  const p = await patient(pc, clinic.id, 'First');
  await pc.engine.push();
  assert.equal((await pc.one('SELECT sync_status FROM patients WHERE id=?', [p.id])).sync_status, 'pending');
  await pc.engine.push();
  const [server] = (await remoteAs(pg, owner).page('patients', { limit: 10 })).rows;
  assert.equal(server.last_name, 'Edited mid-push');
});

test('pulls large tables completely across pages, and later pulls only fetch changes', async () => {
  const owner = randomUUID();
  const pc1 = device(pg, owner);
  const { clinic } = await provision(pc1, owner);
  for (let i = 0; i < 1205; i++) await patient(pc1, clinic.id, `P${i}`);
  await pc1.engine.sync();

  const pc2 = device(pg, owner, { pageSize: 200 });
  const first = await pc2.engine.pull();
  assert.deepEqual(first.errors, []);
  assert.equal(await pc2.count('patients'), 1205);

  const again = await pc2.engine.pull();
  assert.equal(again.total, 0, 'nothing re-applied when nothing changed');
});

test('soft deletes propagate', async () => {
  const owner = randomUUID();
  const pc1 = device(pg, owner);
  const { clinic } = await provision(pc1, owner);
  const p = await patient(pc1, clinic.id, 'ToDelete');
  await pc1.engine.sync();
  const pc2 = device(pg, owner);
  await pc2.engine.sync();
  pc1.edit('patients', p.id, { deleted_at: new Date().toISOString() });
  await pc1.engine.sync();
  await pc2.engine.sync();
  assert.ok((await pc2.one('SELECT deleted_at FROM patients WHERE id=?', [p.id])).deleted_at);
});

test("another clinic's device never receives our data and cannot push into it", async () => {
  const ownerA = randomUUID();
  const ownerB = randomUUID();
  const a = device(pg, ownerA);
  const { clinic: clinicA } = await provision(a, ownerA);
  await patient(a, clinicA.id, 'Confidential');
  await a.engine.sync();

  const b = device(pg, ownerB);
  const { clinic: clinicB } = await provision(b, ownerB);
  await patient(b, clinicB.id, 'Bravo');
  await patient(b, clinicA.id, 'Injected'); // forged clinic_id
  const res = await b.engine.sync();
  assert.ok(res.errors.some((e) => e.table === 'patients' && /row-level security/.test(e.message)));
  // Only its own rows; the legit one still syncs, the forged one stays local and pending.
  assert.deepEqual(await b.local.all('SELECT last_name, sync_status FROM patients ORDER BY last_name'), [
    { last_name: 'Bravo', sync_status: 'synced' },
    { last_name: 'Injected', sync_status: 'pending' },
  ]);
  assert.equal(await b.count('clinics'), 1);

  await a.engine.sync();
  assert.deepEqual((await a.local.all('SELECT last_name FROM patients')).map((r) => r.last_name), ['Confidential']);
});

test('a staff member signing in on their own PC gets the clinic once added by the owner', async () => {
  const owner = randomUUID();
  const staff = randomUUID();
  const pc1 = device(pg, owner);
  const { clinic } = await provision(pc1, owner);
  await patient(pc1, clinic.id, 'Shared');
  await pc1.insert('users', { clinic_id: clinic.id, first_name: 'S', last_name: 'T', email: 's@t', auth_user_id: staff, is_clinic_owner: 0 });

  const ownerSync = await pc1.engine.sync();
  assert.deepEqual(ownerSync.errors, [], 'owner + staff rows pushed together must both land');

  const staffPc = device(pg, staff);
  assert.deepEqual((await staffPc.engine.sync()).errors, []);
  assert.equal(await staffPc.count('patients'), 1);
  assert.equal(await staffPc.count('clinics'), 1);
});
