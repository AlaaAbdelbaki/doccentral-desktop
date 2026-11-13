// Two-way sync engine, independent of Electron/Supabase so it can be tested
// against real Postgres. The app wires it to the local SQLite bridge and
// Supabase (sync.js); tests wire it to sql.js + PGlite.
//
//   local:  { all(sql, params) → rows, run(sql, params) }      (async)
//   remote: { upsert(table, rows) → { error },
//             page(table, { afterTs, afterId, limit }) → { rows, error } }
//
// Push: pending local rows are upserted; the server keeps whichever version
// has the newest updated_at (dc_sync_guard trigger), so push order between
// devices doesn't matter. A row is marked synced only if it wasn't edited
// again while the push was in flight.
//
// Pull: rows changed on the server since our cursor are fetched by
// server_updated_at (stamped by the server — device clocks are not trusted
// for this), oldest first, in keyset pages. Each is applied unless the local
// copy is a newer pending edit (it will win when pushed).

export const SYNC_TABLES = [
  'clinics', 'users', 'roles', 'user_roles', 'patients',
  'appointments', 'appointment_cancellations', 'appointment_planned_treatments',
  'visits', 'performed_treatments', 'planned_treatments',
  'invoices', 'invoice_items', 'payments', 'invoice_voids',
  'inventory_items', 'restock_events', 'stock_adjustments',
  'attachments', 'day_closeouts',
];

// PostgREST returns timestamptz as "2026-11-13T10:00:00.123456+00:00"; the
// app stores and range-compares "2026-11-13T10:00:00.123Z". Normalize.
const ISO_TS = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}(:?\d{2})?)$/;
export const normalizeValue = (v) => (typeof v === 'string' && ISO_TS.test(v) ? new Date(v).toISOString() : v);

export function createSyncEngine({ local, remote, tables = SYNC_TABLES, pageSize = 500, overlapMs = 60_000 }) {
  const columnCache = new Map();
  const columns = async (t) => {
    if (!columnCache.has(t)) columnCache.set(t, (await local.all(`PRAGMA table_info(${t})`)).map((c) => c.name));
    return columnCache.get(t);
  };

  const markSynced = (t, rows) => Promise.all(rows.map((r) =>
    local.run(`UPDATE ${t} SET sync_status='synced' WHERE id=? AND updated_at=? AND sync_status='pending'`,
      [r.id, r.updated_at])));

  // A rejected batch is retried row by row, in passes, while progress is
  // made: one bad row (e.g. rejected by access rules) must not block the
  // rest, and some rows only become valid once another lands first (a new
  // clinic's owner row before the staff rows it authorizes).
  async function pushRowByRow(t, rows) {
    let remaining = rows;
    let lastError = null;
    let pushed = 0;
    for (;;) {
      const failed = [];
      for (const r of remaining) {
        const { error } = await remote.upsert(t, [r]);
        if (error) { failed.push(r); lastError = error; } else { await markSynced(t, [r]); pushed++; }
      }
      if (!failed.length || failed.length === remaining.length) {
        return { pushed, failed, error: failed.length ? lastError : null };
      }
      remaining = failed;
    }
  }

  async function pushTable(t) {
    const rows = await local.all(`SELECT * FROM ${t} WHERE sync_status='pending'`);
    let pushed = 0;
    const failures = [];
    for (let i = 0; i < rows.length; i += pageSize) {
      const chunk = rows.slice(i, i + pageSize);
      const { error } = await remote.upsert(t, chunk);
      if (!error) {
        await markSynced(t, chunk);
        pushed += chunk.length;
        continue;
      }
      if (!/row-level security|violates|permission denied/i.test(error.message || '')) {
        throw new Error(error.message || String(error)); // offline, missing schema…: retry later
      }
      const res = await pushRowByRow(t, chunk);
      pushed += res.pushed;
      if (res.failed.length) failures.push(`${res.failed.length} row(s): ${res.error.message || res.error}`);
    }
    if (failures.length) {
      const e = new Error(failures.join('; '));
      e.pushed = pushed;
      throw e;
    }
    return pushed;
  }

  // Apply one remote row locally; returns true if the local copy changed.
  async function applyRow(t, cols, r) {
    const [mine] = await local.all(`SELECT updated_at, sync_status FROM ${t} WHERE id=?`, [r.id]);
    if (mine) {
      const localTs = Date.parse(mine.updated_at);
      const remoteTs = Date.parse(r.updated_at);
      if (localTs > remoteTs) return false;                                  // ours is newer
      if (localTs === remoteTs && mine.sync_status !== 'pending') return false; // already have it
      if (localTs === remoteTs && mine.sync_status === 'pending') return false; // our edit, pushed below
    }
    const keys = cols.filter((c) => c in r);
    const values = keys.map((c) => (c === 'sync_status' ? 'synced' : normalizeValue(r[c])));
    await local.run(`INSERT OR REPLACE INTO ${t} (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`, values);
    return true;
  }

  async function pullTable(t) {
    const cols = await columns(t);
    const [state] = await local.all(`SELECT cursor_ts, cursor_id FROM sync_state WHERE table_name=?`, [t]);
    // Re-read a short window before the cursor: a write whose transaction
    // committed late can carry a server_updated_at older than rows already
    // seen. Re-applying an unchanged row is a no-op.
    let afterTs = state?.cursor_ts ? new Date(Date.parse(state.cursor_ts) - overlapMs).toISOString() : null;
    let afterId = null;
    let cursor = state || null;
    let applied = 0;
    for (;;) {
      const { rows, error } = await remote.page(t, { afterTs, afterId, limit: pageSize });
      if (error) throw new Error(error.message || String(error));
      for (const r of rows) if (await applyRow(t, cols, r)) applied++;
      if (rows.length) {
        const last = rows[rows.length - 1];
        // Keep the server's exact value (microseconds) for keyset paging.
        afterTs = last.server_updated_at;
        afterId = last.id;
        if (!cursor?.cursor_ts || Date.parse(afterTs) >= Date.parse(cursor.cursor_ts)) {
          cursor = { cursor_ts: afterTs, cursor_id: afterId };
        }
      }
      if (rows.length < pageSize) break;
    }
    if (cursor) {
      await local.run(`INSERT OR REPLACE INTO sync_state (table_name, cursor_ts, cursor_id) VALUES (?,?,?)`,
        [t, cursor.cursor_ts, cursor.cursor_id]);
    }
    return applied;
  }

  async function forEachTable(fn) {
    let total = 0;
    const errors = [];
    for (const t of tables) {
      try {
        total += await fn(t);
      } catch (e) {
        errors.push({ table: t, message: e.message || String(e) });
      }
    }
    return { total, errors };
  }

  return {
    push: () => forEachTable(pushTable),
    pull: () => forEachTable(pullTable),
    // Push first so our edits reach the server, then pull everyone else's.
    async sync() {
      const push = await forEachTable(pushTable);
      const pull = await forEachTable(pullTable);
      return { pushed: push.total, pulled: pull.total, errors: [...push.errors, ...pull.errors] };
    },
    pendingCount: async () => {
      let n = 0;
      for (const t of tables) n += (await local.all(`SELECT COUNT(*) AS n FROM ${t} WHERE sync_status='pending'`))[0].n;
      return n;
    },
  };
}
