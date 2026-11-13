// Persistence safety: atomic saves, daily backups with retention, and
// recovery from a corrupt database file. Run: npm run test:unit
const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const db = require('../../db.js');

let dir;
beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dc-db-')); });
afterEach(() => { db.close(); fs.rmSync(dir, { recursive: true, force: true }); });

const fixedClock = (iso) => () => new Date(iso);
const backups = () => fs.readdirSync(path.join(dir, 'backups')).sort();
const addPatient = (id) => db.run(
  `INSERT INTO patients (id, created_at, updated_at, first_name, last_name, date_of_birth, phone)
   VALUES (?, 'x', 'x', 'A', 'B', '2000-01-01', '1')`, [id]);

test('save writes the file atomically and leaves no temp file', async () => {
  await db.open(dir);
  addPatient('p1');
  db.save();
  assert.ok(fs.existsSync(path.join(dir, 'doccentral.db')));
  assert.ok(!fs.existsSync(path.join(dir, 'doccentral.db.tmp')));
  db.close();
  await db.open(dir);
  assert.equal(db.get('SELECT COUNT(*) n FROM patients').n, 1);
});

test('a leftover temp file from an interrupted save is ignored', async () => {
  await db.open(dir);
  addPatient('p1');
  db.close();
  fs.writeFileSync(path.join(dir, 'doccentral.db.tmp'), 'half-written garbage');
  await db.open(dir);
  assert.equal(db.get('SELECT COUNT(*) n FROM patients').n, 1);
  assert.ok(!fs.existsSync(path.join(dir, 'doccentral.db.tmp')));
});

test('one backup per day, taken on open and on the first save of a new day', async () => {
  let now = '2026-11-10T10:00:00';
  await db.open(dir, { clock: () => new Date(now) });
  assert.deepEqual(backups(), ['doccentral-2026-11-10.db']);
  addPatient('p1');
  db.save();
  assert.deepEqual(backups(), ['doccentral-2026-11-10.db']); // same day: no new backup
  now = '2026-11-11T08:00:00'; // app left open overnight
  addPatient('p2');
  db.save();
  assert.deepEqual(backups(), ['doccentral-2026-11-10.db', 'doccentral-2026-11-11.db']);
});

test(`keeps only the newest ${db.BACKUPS_KEPT} backups`, async () => {
  for (let day = 1; day <= 10; day++) {
    await db.open(dir, { clock: fixedClock(`2026-11-${String(day).padStart(2, '0')}T09:00:00`) });
    db.close();
  }
  const kept = backups();
  assert.equal(kept.length, db.BACKUPS_KEPT);
  assert.equal(kept[0], 'doccentral-2026-11-04.db');
  assert.equal(kept.at(-1), 'doccentral-2026-11-10.db');
});

test('a corrupt database is kept aside and the newest good backup restored', async () => {
  await db.open(dir, { clock: fixedClock('2026-11-12T09:00:00') });
  addPatient('p1');
  db.close();
  await db.open(dir, { clock: fixedClock('2026-11-13T09:00:00') }); // backup with p1
  addPatient('p2');
  db.close();

  const file = path.join(dir, 'doccentral.db');
  const bytes = fs.readFileSync(file);
  bytes.fill(0x7a, 100, 4096); // trash the header / first page
  fs.writeFileSync(file, bytes);

  await db.open(dir, { clock: fixedClock('2026-11-13T15:00:00') });
  const r = db.lastRecovery();
  assert.equal(r.kind, 'restored');
  assert.equal(r.backup, 'doccentral-2026-11-13.db');
  assert.ok(fs.existsSync(r.kept), 'damaged file kept for inspection');
  assert.equal(db.get('SELECT COUNT(*) n FROM patients').n, 1); // p1 back; p2 was after the backup
});

test('a corrupt database with no backups starts empty and reports it', async () => {
  fs.writeFileSync(path.join(dir, 'doccentral.db'), 'not a sqlite file at all');
  await db.open(dir);
  assert.equal(db.lastRecovery().kind, 'reset');
  assert.equal(db.get('SELECT COUNT(*) n FROM patients').n, 0);
});

test('a healthy open reports no recovery', async () => {
  await db.open(dir);
  db.close();
  await db.open(dir);
  assert.equal(db.lastRecovery(), null);
});
