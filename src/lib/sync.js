// Best-effort sync engine — the same sync-metadata pattern as the Flutter app:
// rows are written locally with sync_status='pending'; when online we push them
// to same-named Supabase tables (upsert, last-write-wins by updated_at) and mark
// them 'synced'. If the remote schema is absent or unreachable, rows simply stay
// pending — the app is fully functional offline.
import { all, run } from './dbx.js';
import { supabase } from './supabase.js';

export const SYNC_TABLES = [
  'clinics', 'users', 'roles', 'user_roles', 'patients',
  'appointments', 'appointment_cancellations', 'appointment_planned_treatments',
  'visits', 'performed_treatments', 'planned_treatments',
  'invoices', 'invoice_items', 'payments', 'invoice_voids',
  'inventory_items', 'restock_events', 'stock_adjustments',
  'attachments', 'day_closeouts',
];

const listeners = new Set();
let state = { status: 'idle', pending: 0, lastSync: null, error: null, errors: [] };

export const onSyncState = (fn) => { listeners.add(fn); fn(state); return () => listeners.delete(fn); };
const setState = (patch) => { state = { ...state, ...patch }; listeners.forEach((fn) => fn(state)); };

export async function pendingCount() {
  let n = 0;
  for (const t of SYNC_TABLES) {
    const r = await all(`SELECT COUNT(*) AS n FROM ${t} WHERE sync_status='pending'`);
    n += r[0].n;
  }
  return n;
}

export async function syncNow(session) {
  if (!session) {
    setState({ status: 'offline', pending: await pendingCount(), errors: [], error: 'Not signed in — records kept locally' });
    return 0;
  }
  setState({ status: 'syncing', error: null });
  let pushed = 0;
  const errors = [];
  for (const table of SYNC_TABLES) {
    const rows = await all(`SELECT * FROM ${table} WHERE sync_status='pending'`);
    if (!rows.length) continue;
    try {
      const { error } = await supabase.from(table).upsert(rows, { onConflict: 'id' });
      if (error) throw error;
      for (const r of rows) await run(`UPDATE ${table} SET sync_status='synced' WHERE id=?`, [r.id]);
      pushed += rows.length;
    } catch (e) {
      // Remote table missing / offline / RLS — rows stay pending locally.
      errors.push({ table, count: rows.length, message: (e && e.message) || String(e) });
    }
  }
  const pending = await pendingCount();
  setState({
    status: errors.length ? (pending ? 'pending' : 'idle') : 'synced',
    pending,
    lastSync: errors.length ? state.lastSync : new Date(),
    error: errors.length ? `${errors.length} table(s) failed to sync — records kept locally` : null,
    errors,
  });
  return pushed;
}

let timer = null;
export function startAutoSync(getSession) {
  stopAutoSync();
  const tick = () => syncNow(getSession()).catch(() => {});
  timer = setInterval(tick, 60_000);
  window.addEventListener('online', tick);
  tick();
}
export function stopAutoSync() { if (timer) clearInterval(timer); timer = null; }
