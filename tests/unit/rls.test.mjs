// Cloud access rules (supabase/migrations/0002): each clinic's data is only
// visible to its members, and nobody can make themselves a member of a
// clinic they didn't create. Run against real Postgres (PGlite).
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createSupabase, applyMigration, as } from './supabase-harness.mjs';

const OWNER_A = randomUUID();
const OWNER_B = randomUUID();
const STAFF_A = randomUUID();
const CLINIC_A = randomUUID();
const CLINIC_B = randomUUID();
const now = () => new Date().toISOString();
const meta = () => ({ id: randomUUID(), created_at: now(), updated_at: now() });

let pg;
const insert = (uid, table, row) => as(pg, uid, (q) => {
  const cols = Object.keys(row);
  return q(`insert into public.${table} (${cols}) values (${cols.map((_, i) => `$${i + 1}`)})`, cols.map((c) => row[c]));
});
const select = (uid, sql, params) => as(pg, uid, (q) => q(sql, params)).then((r) => r.rows);
const patient = (clinicId, last) => ({ ...meta(), clinic_id: clinicId, first_name: 'P', last_name: last, date_of_birth: '1990-01-01', phone: '1' });
const userRow = (clinicId, authId, owner = 0) => ({
  ...meta(), clinic_id: clinicId, first_name: 'U', last_name: 'X', email: 'u@x', auth_user_id: authId, is_clinic_owner: owner,
});

// Owner bootstrap exactly as the app's sync pushes it: clinic first, then
// the owner's own users row, then everything else.
async function bootstrap(ownerUid, clinicId, last) {
  await insert(ownerUid, 'clinics', { id: clinicId, created_at: now(), updated_at: now(), name: `Clinic ${last}` });
  await insert(ownerUid, 'users', userRow(clinicId, ownerUid, 1));
  await insert(ownerUid, 'patients', patient(clinicId, last));
}

before(async () => {
  pg = await createSupabase();
  await bootstrap(OWNER_A, CLINIC_A, 'Alpha');
  await bootstrap(OWNER_B, CLINIC_B, 'Bravo');
});

test('a clinic owner sees only their own clinic', async () => {
  const a = await select(OWNER_A, 'select last_name from public.patients');
  assert.deepEqual(a.map((r) => r.last_name), ['Alpha']);
  const clinics = await select(OWNER_A, 'select name from public.clinics');
  assert.deepEqual(clinics.map((r) => r.name), ['Clinic Alpha']);
  const users = await select(OWNER_A, 'select auth_user_id from public.users');
  assert.deepEqual(users.map((r) => r.auth_user_id), [OWNER_A]);
});

test('signed-out (anon) requests see nothing', async () => {
  assert.equal((await select(null, 'select * from public.patients')).length, 0);
  assert.equal((await select(null, 'select * from public.clinics')).length, 0);
});

test('a stranger cannot add themselves to another clinic', async () => {
  const stranger = randomUUID();
  await assert.rejects(insert(stranger, 'users', userRow(CLINIC_A, stranger)), /row-level security/);
  assert.equal((await select(stranger, 'select * from public.patients')).length, 0);
});

test('another clinic cannot write into, edit or hard-delete my rows', async () => {
  await assert.rejects(insert(OWNER_B, 'patients', patient(CLINIC_A, 'Injected')), /row-level security/);
  const [p] = await select(OWNER_A, `select id from public.patients where last_name='Alpha'`);
  await as(pg, OWNER_B, (q) => q(`update public.patients set last_name='Hacked' where id=$1`, [p.id]));
  await as(pg, OWNER_B, (q) => q(`delete from public.patients where id=$1`, [p.id]));
  const after = await select(OWNER_A, `select last_name from public.patients where id=$1`, [p.id]);
  assert.deepEqual(after, [{ last_name: 'Alpha' }]);
});

test('members cannot hard-delete either (soft delete only)', async () => {
  const [p] = await select(OWNER_A, `select id from public.patients where last_name='Alpha'`);
  await as(pg, OWNER_A, (q) => q(`delete from public.patients where id=$1`, [p.id]));
  assert.equal((await select(OWNER_A, `select id from public.patients where id=$1`, [p.id])).length, 1);
});

test('a staff member added by the owner gets access; removing them revokes it', async () => {
  const staffRow = userRow(CLINIC_A, STAFF_A);
  await insert(OWNER_A, 'users', staffRow);
  const seen = await select(STAFF_A, 'select last_name from public.patients');
  assert.deepEqual(seen.map((r) => r.last_name), ['Alpha']);

  await as(pg, OWNER_A, (q) => q(`update public.users set deleted_at=$1, updated_at=$1 where id=$2`, [now(), staffRow.id]));
  assert.equal((await select(STAFF_A, 'select * from public.patients')).length, 0);
});

test('a member cannot move a row into another clinic', async () => {
  const [p] = await select(OWNER_A, `select id from public.patients where last_name='Alpha'`);
  await assert.rejects(
    as(pg, OWNER_A, (q) => q(`update public.patients set clinic_id=$1, updated_at=$2 where id=$3`, [CLINIC_B, now(), p.id])),
    /row-level security/);
});

test('server stamps server_updated_at and keeps the newest write', async () => {
  const row = patient(CLINIC_A, 'Clock');
  row.updated_at = '2026-11-13T10:00:00.000Z';
  await insert(OWNER_A, 'patients', row);
  const [first] = await select(OWNER_A, 'select server_updated_at from public.patients where id=$1', [row.id]);
  assert.ok(first.server_updated_at instanceof Date);

  // A stale device pushes an older edit: ignored.
  await as(pg, OWNER_A, (q) => q(`update public.patients set last_name='Stale', updated_at=$1 where id=$2`, ['2026-11-13T09:00:00.000Z', row.id]));
  // A newer edit: applied, and server_updated_at moves forward.
  await as(pg, OWNER_A, (q) => q(`update public.patients set last_name='Fresh', updated_at=$1 where id=$2`, ['2026-11-13T11:00:00.000Z', row.id]));
  const [r] = await select(OWNER_A, 'select last_name, server_updated_at from public.patients where id=$1', [row.id]);
  assert.equal(r.last_name, 'Fresh');
  assert.ok(r.server_updated_at > first.server_updated_at);
});

test('migrating an existing single-clinic project assigns old rows to it', async () => {
  const legacy = await createSupabase({ migrations: ['0001'] });
  const owner = randomUUID();
  const clinicId = randomUUID();
  // Data pushed under 0001 (no clinic_id column on patients yet).
  await legacy.query(`insert into public.clinics (id, created_at, updated_at, name) values ($1, now(), now(), 'Old')`, [clinicId]);
  await legacy.query(`insert into public.users (id, created_at, updated_at, clinic_id, first_name, last_name, email, auth_user_id, is_clinic_owner)
                      values ($1, now(), now(), $2, 'O', 'W', 'o@w', $3, 1)`, [randomUUID(), clinicId, owner]);
  await legacy.query(`insert into public.patients (id, created_at, updated_at, first_name, last_name, date_of_birth, phone)
                      values ($1, now(), now(), 'P', 'Legacy', now(), '1')`, [randomUUID()]);
  await applyMigration(legacy, '0002');
  await applyMigration(legacy, '0002'); // idempotent

  const prev = pg; pg = legacy;
  try {
    const seen = await select(owner, 'select last_name, clinic_id from public.patients');
    assert.deepEqual(seen, [{ last_name: 'Legacy', clinic_id: clinicId }]);
    const [c] = await select(owner, 'select created_by from public.clinics');
    assert.equal(c.created_by, owner);
  } finally {
    pg = prev;
  }
});

test('re-running the setup scripts in any order never re-opens access', async () => {
  await applyMigration(pg, '0001');
  await applyMigration(pg, '0002');
  await applyMigration(pg, '0001');
  const stranger = randomUUID();
  assert.equal((await select(stranger, 'select * from public.patients')).length, 0);
  assert.equal((await select(OWNER_B, `select * from public.patients where clinic_id=$1`, [CLINIC_A])).length, 0);
});
