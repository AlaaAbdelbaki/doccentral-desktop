// App wiring for the two-way sync engine (sync-core.js): local SQLite via the
// IPC bridge, Supabase as the remote. Runs every 60s and when the network
// comes back. Offline or not set up yet, records stay pending locally and the
// app keeps working.
import { all, run, emitDataChanged, resetClinicCache } from './dbx.js';
import { supabase } from './supabase.js';
import { createSyncEngine, SYNC_TABLES } from './sync-core.js';
import { t } from './translate.js';
import MIGRATION_0001 from '../../supabase/migrations/0001_init_doccentral.sql';
import MIGRATION_0002 from '../../supabase/migrations/0002_clinic_isolation_and_sync.sql';
import MIGRATION_0003 from '../../supabase/migrations/0003_bug_reports.sql';

export { SYNC_TABLES };
// All scripts are idempotent and safe to run in order on any project.
export const MIGRATION_SQL = [MIGRATION_0001, MIGRATION_0002, MIGRATION_0003].join('\n\n');

// PostgREST errors when the cloud schema (or the 0002 upgrade) is missing.
const isMissingSchema = (msg) => /schema cache|does not exist|server_updated_at|clinic_id/i.test(msg || '');
// PostgREST filter values containing . : , ( ) must be double-quoted.
const q = (v) => `"${v}"`;

const supabaseRemote = {
  upsert: (table, rows) => supabase.from(table).upsert(rows, { onConflict: 'id' }),
  async page(table, { afterTs, afterId, limit }) {
    let query = supabase.from(table).select('*').order('server_updated_at').order('id').limit(limit);
    if (afterTs) {
      query = query.or(afterId
        ? `server_updated_at.gt.${q(afterTs)},and(server_updated_at.eq.${q(afterTs)},id.gt.${afterId})`
        : `server_updated_at.gt.${q(afterTs)}`);
    }
    const { data, error } = await query;
    return { rows: data || [], error };
  },
};

const engine = createSyncEngine({ local: { all, run }, remote: supabaseRemote });

const listeners = new Set();
// `error` is a function returning the message, so it's translated when shown
// (a stored string would keep the language that was active when it was set).
let state = { status: 'idle', pending: 0, lastSync: null, error: null, errors: [] };
export const onSyncState = (fn) => { listeners.add(fn); fn(state); return () => listeners.delete(fn); };
const setState = (patch) => { state = { ...state, ...patch }; listeners.forEach((fn) => fn(state)); };

export const pendingCount = () => engine.pendingCount();

let inFlight = null;
export function syncNow(session) {
  // Never run two syncs at once (timer + button + reconnect).
  if (!inFlight) inFlight = doSync(session).finally(() => { inFlight = null; });
  return inFlight;
}

async function doSync(session) {
  if (!session) {
    setState({ status: 'offline', pending: await pendingCount(), errors: [], error: () => t('Not signed in — records kept locally') });
    return 0;
  }
  setState({ status: 'syncing', error: null });
  const { pushed, pulled, errors } = await engine.sync();
  // Goes to the app log (attachable to a bug report).
  for (const e of errors) console.warn(`sync: ${e.table}: ${e.message}`);
  if (pulled) { resetClinicCache(); emitDataChanged(); }
  const pending = await pendingCount();
  setState({
    status: errors.length ? (pending ? 'pending' : 'idle') : 'synced',
    pending,
    lastSync: errors.length ? state.lastSync : new Date(),
    error: errors.length ? () => t('{n} table(s) failed to sync — records kept locally', { n: errors.length }) : null,
    errors,
    needsSetup: errors.some((e) => isMissingSchema(e.message)),
  });
  return pushed + pulled;
}

// Which clinic(s) does this account belong to in the cloud?
//   { online: false }                       → couldn't reach / not set up
//   { online: true, membership: row|null }  → live users row for this account
//   { online: true, membership: null, schemaMissing: true } → cloud not set up
export async function fetchMembership(authUserId) {
  try {
    const { data, error } = await supabase.from('users').select('*')
      .eq('auth_user_id', authUserId).is('deleted_at', null).limit(1);
    if (error) {
      // Reachable, but the cloud tables aren't set up: nobody can be verified.
      if (isMissingSchema(error.message)) return { online: true, membership: null, schemaMissing: true };
      return { online: false, error: error.message };
    }
    return { online: true, membership: data[0] || null };
  } catch (e) {
    return { online: false, error: e.message || String(e) };
  }
}

// First sign-in on a device: download the whole clinic before showing it.
export async function initialPull() {
  const res = await engine.pull();
  resetClinicCache();
  emitDataChanged();
  return res;
}

let timer = null;
let onlineHandler = null;
export function startAutoSync(getSession) {
  stopAutoSync();
  const tick = () => syncNow(getSession()).catch(() => {});
  timer = setInterval(tick, 60_000);
  onlineHandler = tick;
  window.addEventListener('online', onlineHandler);
  tick();
}
export function stopAutoSync() {
  if (timer) clearInterval(timer);
  if (onlineHandler) window.removeEventListener('online', onlineHandler);
  timer = null;
  onlineHandler = null;
}
