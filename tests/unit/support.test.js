// "Report a problem" plumbing in the main process (support.js): personal data
// is scrubbed from logs, the log stays bounded, and queued reports survive a
// restart intact.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { redact, createLogger, createOutbox } = require('../../support');

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'dc-support-'));

test('redact removes personal data', () => {
  const home = 'C:\\Users\\Alaa';
  const cases = [
    ['failed to open C:\\Users\\Alaa\\AppData\\Roaming\\DocCentral\\doccentral.db', 'failed to open ~\\AppData\\Roaming\\DocCentral\\doccentral.db'],
    ['at C:\\Users\\someone\\x.js', 'at C:\\Users\\<user>\\x.js'],
    ['at /home/bob/app/x.js', 'at /home/<user>/app/x.js'],
    ['sign-in failed for dentist@clinic.tn', 'sign-in failed for <email>'],
    ['patient phone +216 54 887 210 invalid', 'patient phone <number> invalid'],
    ['call 22314508', 'call <number>'],
    ['Authorization: Bearer abc.def.ghi', 'Authorization: Bearer <redacted>'],
    ['token eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.sig_x-1', 'token <token>'],
    ['{"password":"hunter2"}', '{"password":"<redacted>"}'],
  ];
  for (const [input, expected] of cases) assert.equal(redact(input, { home }), expected);
});

test('redact keeps what makes a log useful', () => {
  const keep = [
    'row 550e8400-e29b-41d4-a716-446655440000 failed',
    'synced at 2026-11-14T15:29:03.120Z and 2026-11-14 15:29',
    'bundle.js:1234 TypeError: x is undefined',
    'Electron 45.3.2, 3 tables, 1440x900',
  ];
  for (const line of keep) assert.equal(redact(line, { home: 'C:\\Users\\Alaa' }), line);
});

test('the log rotates and keeps a bounded tail', () => {
  const dir = tmp();
  const log = createLogger(dir, { maxBytes: 2000, home: 'C:\\Users\\Alaa' });
  for (let i = 0; i < 100; i++) log.write('error', `line ${i} for dentist@clinic.tn`);
  assert.ok(fs.statSync(log.file).size <= 2000);
  assert.ok(fs.existsSync(`${log.file}.1`));
  const tail = log.tail(1000);
  assert.ok(tail.length <= 1000);
  assert.match(tail, /line 99 for <email>\n$/);
  assert.match(tail, /^\d{4}-\d{2}-\d{2}T/); // starts on a full line
  assert.doesNotMatch(fs.readFileSync(log.file, 'utf8') + fs.readFileSync(`${log.file}.1`, 'utf8'), /@clinic/);
});

test('queued reports survive a restart byte for byte, and ids cannot escape the folder', () => {
  const dir = tmp();
  const bytes = new Uint8Array([137, 80, 78, 71, 0, 255, 1]);
  const report = { id: '550e8400-e29b-41d4-a716-446655440000', description: 'x', diagnostics: null, logs: null, files: [{ name: 'a.png', type: 'image/png', bytes }] };
  createOutbox(dir).put(report);
  const [back] = createOutbox(dir).list();
  assert.equal(back.description, 'x');
  assert.deepEqual([...back.files[0].bytes], [...bytes]);
  createOutbox(dir).remove(report.id);
  assert.equal(createOutbox(dir).count(), 0);
  assert.throws(() => createOutbox(dir).remove('../../doccentral'), /invalid report id/);
  assert.throws(() => createOutbox(dir).put({ ...report, id: '..\\x' }), /invalid report id/);
});

test('an unreadable queued report is skipped, not fatal', () => {
  const dir = tmp();
  fs.writeFileSync(path.join(dir, '550e8400-e29b-41d4-a716-446655440001.json'), '{broken');
  assert.deepEqual(createOutbox(dir).list(), []);
});
