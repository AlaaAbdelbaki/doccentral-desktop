// Bug report logic (src/lib/bugreport-core.js): only what the user opted into
// is sent, nothing is lost when offline, and retries don't duplicate.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildReport, createReporter, safeName, LIMITS } from '../../src/lib/bugreport-core.js';

const ID = '550e8400-e29b-41d4-a716-446655440000';
const UID = '11111111-2222-3333-4444-555555555555';
const png = { name: 'écran 1.png', type: 'image/png', bytes: new Uint8Array([1, 2, 3]) };
const base = { id: ID, description: '  Calendar froze  ', device: { os: 'win' }, logs: 'log text', files: [png] };

function fakes({ failUploads = 0, failInserts = 0 } = {}) {
  const uploaded = new Map();
  const rows = new Map();
  const queue = new Map();
  const remote = {
    async upload(path, bytes) {
      if (failUploads-- > 0) return { error: { message: 'Failed to fetch' } };
      if (uploaded.has(path)) return { error: { statusCode: '409', message: 'The resource already exists' } };
      uploaded.set(path, bytes);
      return { error: null };
    },
    async insert(row) {
      if (failInserts-- > 0) return { error: { message: 'Failed to fetch' } };
      if (rows.has(row.id)) return { error: { code: '23505', message: 'duplicate key' } };
      rows.set(row.id, row);
      return { error: null };
    },
  };
  const outbox = {
    put: async (r) => { queue.set(r.id, structuredClone(r)); },
    list: async () => [...queue.values()],
    remove: async (id) => { queue.delete(id); },
  };
  return { remote, outbox, uploaded, rows, queue };
}

test('device info and logs are left out unless the user ticks them', () => {
  const r = buildReport(base);
  assert.equal(r.diagnostics, null);
  assert.equal(r.logs, null);
  assert.equal(r.description, 'Calendar froze');
  const all = buildReport({ ...base, includeDevice: true, includeLogs: true });
  assert.deepEqual(all.diagnostics, { os: 'win' });
  assert.equal(all.logs, 'log text');
});

test('reports are validated before anything is sent', () => {
  assert.throws(() => buildReport({ ...base, description: '   ' }), /description is required/);
  assert.throws(() => buildReport({ ...base, description: 'x'.repeat(LIMITS.description + 1) }), /too long/);
  assert.throws(() => buildReport({ ...base, files: Array(LIMITS.files + 1).fill(png) }), /Too many files/);
  assert.throws(() => buildReport({ ...base, files: [{ ...png, bytes: new Uint8Array(LIMITS.fileBytes + 1) }] }), /too large/);
});

test('sending uploads files into the reporter folder, then files the report', async () => {
  const f = fakes();
  const res = await createReporter(f).submit(buildReport(base), UID);
  assert.deepEqual(res, { status: 'sent' });
  const path = `${UID}/${ID}/0-ecran_1.png`;
  assert.deepEqual([...f.uploaded.keys()], [path]);
  const row = f.rows.get(ID);
  assert.equal(row.reporter_auth_id, UID);
  assert.equal(row.files, undefined); // bytes never go into the table
  assert.deepEqual(row.attachments, [{ path, name: 'écran 1.png', type: 'image/png', size: 3 }]);
  assert.equal(f.queue.size, 0);
});

test('offline or signed out: the report is queued, then sent by the next flush', async () => {
  const f = fakes({ failUploads: 1 });
  const reporter = createReporter(f);
  assert.equal((await reporter.submit(buildReport(base), UID)).status, 'queued');
  assert.equal((await reporter.submit(buildReport({ ...base, id: UID }), null)).status, 'queued');
  assert.equal(f.queue.size, 2);
  assert.equal(await reporter.flush(null), 0); // still signed out: nothing happens
  assert.equal(await reporter.flush(UID), 2);
  assert.equal(f.queue.size, 0);
  assert.equal(f.rows.size, 2);
});

test('a retry after a partial failure does not duplicate or get stuck', async () => {
  const f = fakes({ failInserts: 1 }); // files uploaded, then the insert failed
  const reporter = createReporter(f);
  assert.equal((await reporter.submit(buildReport(base), UID)).status, 'queued');
  assert.equal(await reporter.flush(UID), 1); // upload answers "already exists": fine
  assert.equal(await reporter.flush(UID), 0);
  assert.equal(f.rows.size, 1);
  assert.equal(f.uploaded.size, 1);
});

test('one report that keeps failing does not block the others', async () => {
  const f = fakes();
  const reporter = createReporter(f);
  await f.outbox.put({ ...buildReport(base), id: 'bad' });
  await f.outbox.put(buildReport({ ...base, id: UID }));
  const insert = f.remote.insert;
  f.remote.insert = async (row) => (row.id === 'bad' ? { error: { message: 'violates row-level security' } } : insert(row));
  assert.equal(await reporter.flush(UID), 1);
  assert.deepEqual([...f.queue.keys()], ['bad']);
});

test('storage names are safe', () => {
  for (const name of ['../../etc/passwd', '..\\..\\x.db', 'صورة.png', '', '.hidden']) {
    const n = safeName(name);
    assert.ok(n && !/[\\/]/.test(n) && !n.startsWith('.'), `${name} → ${n}`);
  }
  assert.equal(safeName('rapport (final).pdf'), 'rapport_final_.pdf');
});
