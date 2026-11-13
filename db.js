// Local SQLite database (sql.js — WASM, no native build) persisted to userData.
// Schema mirrors the Flutter app's Drift tables incl. the sync-metadata pattern:
// every table carries id / created_at / updated_at / deleted_at / sync_status.
const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const META = `
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending'`;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS clinics (${META},
  name TEXT NOT NULL, address TEXT, phone TEXT, email TEXT,
  invoice_footer TEXT, logo_path TEXT,
  locale TEXT NOT NULL DEFAULT 'fr-TN', currency TEXT NOT NULL DEFAULT 'TND');
CREATE TABLE IF NOT EXISTS users (${META},
  clinic_id TEXT NOT NULL, first_name TEXT NOT NULL, last_name TEXT NOT NULL,
  email TEXT NOT NULL, auth_user_id TEXT NOT NULL,
  is_clinic_owner INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS roles (${META},
  clinic_id TEXT NOT NULL, name TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS user_roles (${META},
  user_id TEXT NOT NULL, role_id TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS patients (${META},
  first_name TEXT NOT NULL, last_name TEXT NOT NULL, date_of_birth TEXT NOT NULL,
  phone TEXT NOT NULL, email TEXT, history_notes TEXT);
CREATE TABLE IF NOT EXISTS appointments (${META},
  patient_id TEXT NOT NULL, assigned_user_id TEXT NOT NULL,
  start_time TEXT NOT NULL, end_time TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled', reason TEXT, notes TEXT,
  rescheduled_to_appointment_id TEXT);
CREATE TABLE IF NOT EXISTS appointment_cancellations (${META},
  appointment_id TEXT NOT NULL, actor_user_id TEXT NOT NULL,
  reason TEXT NOT NULL, notes TEXT);
CREATE TABLE IF NOT EXISTS appointment_planned_treatments (${META},
  appointment_id TEXT NOT NULL, planned_treatment_id TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS visits (${META},
  appointment_id TEXT NOT NULL, patient_id TEXT NOT NULL, dentist_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'checked_in',
  started_at TEXT NOT NULL, in_progress_at TEXT,
  diagnosis TEXT, clinical_notes TEXT, ended_at TEXT);
CREATE TABLE IF NOT EXISTS performed_treatments (${META},
  visit_id TEXT NOT NULL, tooth_number TEXT NOT NULL, procedure_name TEXT NOT NULL,
  unit_price REAL NOT NULL, quantity INTEGER NOT NULL, recorded_by_user_id TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS planned_treatments (${META},
  patient_id TEXT NOT NULL, procedure_name TEXT NOT NULL, tooth_number TEXT NOT NULL,
  estimated_unit_price REAL NOT NULL, sequence_number INTEGER NOT NULL,
  target_date TEXT, status TEXT NOT NULL DEFAULT 'planned');
CREATE TABLE IF NOT EXISTS invoices (${META},
  patient_id TEXT NOT NULL, visit_id TEXT NOT NULL, total_amount REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft', created_by_user_id TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS invoice_items (${META},
  invoice_id TEXT NOT NULL, description TEXT NOT NULL, tooth_number TEXT,
  quantity INTEGER NOT NULL, unit_price REAL NOT NULL, total_price REAL NOT NULL,
  adjustment_type TEXT);
CREATE TABLE IF NOT EXISTS payments (${META},
  invoice_id TEXT NOT NULL, amount REAL NOT NULL, method TEXT NOT NULL DEFAULT 'cash',
  payment_date TEXT NOT NULL, notes TEXT, recorded_by_user_id TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS invoice_voids (${META},
  invoice_id TEXT NOT NULL, actor_user_id TEXT NOT NULL, reason TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS inventory_items (${META},
  name TEXT NOT NULL, category TEXT NOT NULL, unit TEXT NOT NULL,
  on_hand_quantity INTEGER NOT NULL, low_stock_threshold INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS restock_events (${META},
  inventory_item_id TEXT NOT NULL, quantity_added INTEGER NOT NULL,
  restock_date TEXT NOT NULL, supplier TEXT, notes TEXT, actor_user_id TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS stock_adjustments (${META},
  inventory_item_id TEXT NOT NULL, old_quantity INTEGER NOT NULL,
  new_quantity INTEGER NOT NULL, delta INTEGER NOT NULL,
  reason TEXT NOT NULL, actor_user_id TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS attachments (${META},
  target_type TEXT NOT NULL, target_id TEXT NOT NULL, file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL, file_size_bytes INTEGER NOT NULL,
  uploaded_by_user_id TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS day_closeouts (${META},
  closeout_date TEXT NOT NULL, expected_cash REAL NOT NULL, counted_cash REAL NOT NULL,
  delta REAL NOT NULL, notes TEXT, actor_user_id TEXT NOT NULL, reopened_at TEXT);
`;

const BACKUPS_KEPT = 7;

let db = null;
let dbFile = null;
let saveTimer = null;
// What open() had to do, for the UI to report: null | { kind, kept, backup }.
let recovery = null;
let dataDir = null;
let lastBackupDay = null;
let now = () => new Date(); // injectable clock (tests)

// Local calendar day, e.g. 2026-11-13 (not UTC — backups follow the clinic's day).
const localDay = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Write durably: temp file + fsync + rename. A crash or power cut mid-save
// leaves either the old or the new file intact, never a half-written one.
function writeAtomic(file, bytes) {
  const tmp = `${file}.tmp`;
  const fd = fs.openSync(tmp, 'w');
  try {
    fs.writeSync(fd, bytes);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  fs.renameSync(tmp, file);
}

// Returns an open sql.js Database if the bytes are a readable SQLite file.
function tryLoad(SQL, bytes) {
  try {
    const d = new SQL.Database(bytes);
    const [res] = d.exec('PRAGMA integrity_check');
    if (res && res.values[0][0] === 'ok') return d;
    d.close();
  } catch {}
  return null;
}

const backupDir = (dir) => path.join(dir, 'backups');
const listBackups = (dir) => {
  const d = backupDir(dir);
  return fs.existsSync(d)
    ? fs.readdirSync(d).filter((f) => /^doccentral-\d{4}-\d{2}-\d{2}\.db$/.test(f)).sort()
    : [];
};

// One backup per day of the last known-good database, keeping the newest N.
function dailyBackup(dir, bytes) {
  const d = backupDir(dir);
  fs.mkdirSync(d, { recursive: true });
  const stamp = localDay(now());
  lastBackupDay = stamp;
  const target = path.join(d, `doccentral-${stamp}.db`);
  if (!fs.existsSync(target)) writeAtomic(target, bytes);
  const all = listBackups(dir);
  for (const old of all.slice(0, Math.max(0, all.length - BACKUPS_KEPT))) {
    fs.rmSync(path.join(d, old), { force: true });
  }
}

async function open(userDataDir, { clock } = {}) {
  now = clock || (() => new Date());
  dataDir = userDataDir;
  const SQL = await initSqlJs({
    locateFile: (f) => path.join(__dirname, 'node_modules', 'sql.js', 'dist', f),
  });
  dbFile = path.join(userDataDir, 'doccentral.db');
  db = null;
  recovery = null;
  fs.rmSync(`${dbFile}.tmp`, { force: true }); // leftover from an interrupted save

  if (fs.existsSync(dbFile)) {
    db = tryLoad(SQL, fs.readFileSync(dbFile));
    if (!db) {
      // Corrupt main file: keep it for inspection, restore the newest good backup.
      const kept = `${dbFile}.corrupt-${Date.now()}`;
      fs.renameSync(dbFile, kept);
      for (const b of listBackups(userDataDir).reverse()) {
        db = tryLoad(SQL, fs.readFileSync(path.join(backupDir(userDataDir), b)));
        if (db) { recovery = { kind: 'restored', kept, backup: b }; break; }
      }
      if (!db) recovery = { kind: 'reset', kept, backup: null };
    }
  }
  if (!db) db = new SQL.Database();
  db.exec(SCHEMA);
  save();
  return db;
}

function save() {
  if (!db || !dbFile) return;
  clearTimeout(saveTimer);
  saveTimer = null;
  const bytes = Buffer.from(db.export());
  writeAtomic(dbFile, bytes);
  // First save of each day (app may stay open for days) also snapshots a backup.
  if (localDay(now()) !== lastBackupDay) dailyBackup(dataDir, bytes);
}

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(save, 250);
}

function all(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function get(sql, params = []) {
  const rows = all(sql, params);
  return rows.length ? rows[0] : null;
}

function run(sql, params = []) {
  db.run(sql, params);
  scheduleSave();
  return { changes: db.getRowsModified() };
}

function close() {
  if (!db) return;
  save();
  db.close();
  db = null;
  dbFile = null;
  dataDir = null;
  lastBackupDay = null;
}

const lastRecovery = () => recovery;

module.exports = { open, save, close, all, get, run, lastRecovery, BACKUPS_KEPT };
