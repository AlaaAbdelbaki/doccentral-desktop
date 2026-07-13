// Thin renderer-side wrapper over the main-process SQLite bridge,
// plus sync-metadata helpers shared by every repository.
export const all = (sql, params = []) => window.dc.db.all(sql, params);
export const get = (sql, params = []) => window.dc.db.get(sql, params);
export const run = (sql, params = []) => window.dc.db.run(sql, params);

export const nowIso = () => new Date().toISOString();
export const uuid = () => crypto.randomUUID();

export const newMeta = () => {
  const t = nowIso();
  return { id: uuid(), created_at: t, updated_at: t, deleted_at: null, sync_status: 'pending' };
};

export async function insert(table, fields) {
  const row = { ...newMeta(), ...fields };
  const cols = Object.keys(row);
  await run(
    `INSERT INTO ${table} (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`,
    cols.map((c) => row[c] ?? null),
  );
  return row;
}

export async function update(table, id, patch) {
  const fields = { ...patch, updated_at: nowIso(), sync_status: 'pending' };
  const cols = Object.keys(fields);
  await run(
    `UPDATE ${table} SET ${cols.map((c) => `${c}=?`).join(',')} WHERE id=?`,
    [...cols.map((c) => fields[c] ?? null), id],
  );
}

export const softDelete = (table, id) => update(table, id, { deleted_at: nowIso() });

// Notify pages that local data changed so open views can refresh.
const listeners = new Set();
export const onDataChanged = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
export const emitDataChanged = () => listeners.forEach((fn) => fn());
