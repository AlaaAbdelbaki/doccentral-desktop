// "Report a problem" support in the main process:
//   - an app log (userData/logs/doccentral.log) of errors and warnings, with
//     personal data scrubbed before anything is written;
//   - device information for a report — collected only when the user asks to
//     include it, and shown to them before sending;
//   - a screenshot of the app window, files picked by the user, and an outbox
//     for reports that couldn't be sent yet (offline / not signed in).
//
// Kept free of a top-level `require('electron')` so the pure parts (redact,
// log rotation, outbox) are testable with plain Node.
const fs = require('fs');
const os = require('os');
const path = require('path');

const LOG_MAX_BYTES = 1024 * 1024; // current file; one rotated file is kept
const LOG_TAIL_BYTES = 200 * 1024; // what a report can include
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_FILES = 5;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ---------------------------------------------------------------- redaction
// Logs must never carry personal data: emails, phone numbers, tokens, or the
// Windows user name (it appears in file paths).
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Record ids (UUIDs) and timestamps are kept: they're what makes a log useful,
// and they'd otherwise look like phone numbers.
const KEEP = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?/gi;
function redact(text, { home = os.homedir() } = {}) {
  const kept = [];
  let s = String(text).replace(KEEP, (m) => `\u0000${kept.push(m) - 1}\u0000`);
  if (home) s = s.replace(new RegExp(escapeRe(home), 'gi'), '~');
  s = s
    .replace(/([A-Za-z]:[\\/]+Users[\\/]+)[^\\/\s"'`]+/gi, '$1<user>')
    .replace(/(\/(?:home|Users)\/)[^/\s"'`]+/g, '$1<user>')
    .replace(/\beyJ[\w-]+\.[\w-]+\.[\w-]+/g, '<token>')
    .replace(/\b(Bearer|apikey|access_token|refresh_token|password)(["'\s:=]+)[^\s"',}]+/gi, '$1$2<redacted>')
    .replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, '<email>')
    .replace(/\+?\d[\d ().-]{6,}\d/g, (m) => (m.replace(/\D/g, '').length >= 8 ? '<number>' : m));
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => kept[i]);
}

// ---------------------------------------------------------------- log file
function createLogger(dir, { maxBytes = LOG_MAX_BYTES, home } = {}) {
  const file = path.join(dir, 'doccentral.log');
  const old = `${file}.1`;
  const write = (level, message) => {
    try {
      fs.mkdirSync(dir, { recursive: true });
      const line = `${new Date().toISOString()} [${level}] ${redact(message, { home })}\n`;
      const size = fs.existsSync(file) ? fs.statSync(file).size : 0;
      if (size + Buffer.byteLength(line) > maxBytes) fs.renameSync(file, old); // replaces the older one
      fs.appendFileSync(file, line);
    } catch {
      // Logging must never break the app.
    }
  };
  // The most recent `bytes` of the log, starting at a line boundary.
  const tail = (bytes = LOG_TAIL_BYTES) => {
    const read = (f) => (fs.existsSync(f) ? fs.readFileSync(f) : Buffer.alloc(0));
    const all = Buffer.concat([read(old), read(file)]);
    if (all.length <= bytes) return all.toString('utf8');
    const cut = all.subarray(all.length - bytes).toString('utf8');
    return cut.slice(cut.indexOf('\n') + 1);
  };
  return { write, tail, file };
}

// ---------------------------------------------------------------- outbox
// Reports waiting to be sent: one JSON file each, attachments base64-encoded.
function createOutbox(dir) {
  const fileOf = (id) => {
    if (!UUID.test(String(id))) throw new Error('invalid report id');
    return path.join(dir, `${id}.json`);
  };
  return {
    put(report) {
      fs.mkdirSync(dir, { recursive: true });
      const files = (report.files || []).map((f) => ({
        name: f.name, type: f.type, data: Buffer.from(f.bytes).toString('base64'),
      }));
      const tmp = `${fileOf(report.id)}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify({ ...report, files }));
      fs.renameSync(tmp, fileOf(report.id));
    },
    list() {
      if (!fs.existsSync(dir)) return [];
      return fs.readdirSync(dir).filter((f) => /\.json$/.test(f)).sort().flatMap((f) => {
        try {
          const r = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
          return [{ ...r, files: (r.files || []).map((x) => ({ name: x.name, type: x.type, bytes: new Uint8Array(Buffer.from(x.data, 'base64')) })) }];
        } catch {
          return []; // unreadable entry: skip it rather than block the others
        }
      });
    },
    remove(id) { fs.rmSync(fileOf(id), { force: true }); },
    count() { return fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => /\.json$/.test(f)).length : 0; },
  };
}

// ---------------------------------------------------------------- device info
// Technical facts only: no computer name, user name, paths, network addresses
// or hardware serials.
function deviceInfo({ app, screen, dataDir }) {
  const mb = (n) => Math.round(n / (1024 * 1024));
  const dbFile = path.join(dataDir, 'doccentral.db');
  const backups = path.join(dataDir, 'backups');
  const cpus = os.cpus();
  return {
    app: { version: app.getVersion(), installed: app.isPackaged },
    runtime: { electron: process.versions.electron, chrome: process.versions.chrome, node: process.versions.node },
    os: { platform: process.platform, release: os.release(), version: typeof os.version === 'function' ? os.version() : null, arch: process.arch },
    cpu: { model: cpus[0]?.model?.trim() || null, cores: cpus.length },
    memoryMB: { total: mb(os.totalmem()), free: mb(os.freemem()) },
    displays: screen.getAllDisplays().map((d) => ({ width: d.size.width, height: d.size.height, scale: d.scaleFactor })),
    locale: { app: app.getLocale(), system: typeof app.getSystemLocale === 'function' ? app.getSystemLocale() : null },
    database: {
      sizeKB: fs.existsSync(dbFile) ? Math.round(fs.statSync(dbFile).size / 1024) : null,
      backups: fs.existsSync(backups) ? fs.readdirSync(backups).filter((f) => f.endsWith('.db')).length : 0,
    },
    uptimeMinutes: Math.round(process.uptime() / 60),
  };
}

// ---------------------------------------------------------------- wiring
function register({ app, ipcMain, dialog, screen, win, dataDir, logger }) {
  const outbox = createOutbox(path.join(dataDir, 'outbox', 'bug-reports'));

  ipcMain.handle('report:device', () => deviceInfo({ app, screen, dataDir }));
  ipcMain.handle('report:logs', () => logger.tail());
  ipcMain.handle('report:log', (_e, level, message) => logger.write(String(level).slice(0, 10), String(message).slice(0, 4000)));
  ipcMain.handle('report:screenshot', async () => new Uint8Array((await win.webContents.capturePage()).toPNG()));
  ipcMain.handle('report:pickFiles', async () => {
    const res = await dialog.showOpenDialog(win, { properties: ['openFile', 'multiSelections'] });
    if (res.canceled) return [];
    return res.filePaths.slice(0, MAX_FILES).map((p) => {
      const size = fs.statSync(p).size;
      const name = path.basename(p);
      if (size > MAX_FILE_BYTES) return { name, size, tooLarge: true };
      return { name, size, bytes: new Uint8Array(fs.readFileSync(p)) };
    });
  });
  ipcMain.handle('report:outboxPut', (_e, report) => outbox.put(report));
  ipcMain.handle('report:outboxList', () => outbox.list());
  ipcMain.handle('report:outboxRemove', (_e, id) => outbox.remove(id));
}

// Errors and warnings worth having in a report, from both processes.
function captureLogs({ app, win, logger }) {
  logger.write('info', `DocCentral ${app.getVersion()} started (${process.platform} ${os.release()}, Electron ${process.versions.electron})`);
  win.webContents.on('console-message', (e) => {
    if (e.level === 'warning' || e.level === 'error') {
      logger.write(e.level, `${e.message} (${path.basename(e.sourceId || '')}:${e.lineNumber})`);
    }
  });
  win.webContents.on('render-process-gone', (_e, d) => logger.write('error', `renderer gone: ${d.reason} (exit ${d.exitCode})`));
  win.on('unresponsive', () => logger.write('warning', 'window unresponsive'));
  // Monitor only: logs without changing how Electron handles the crash.
  process.on('uncaughtExceptionMonitor', (err) => logger.write('error', `main: ${err.stack || err}`));
  process.on('unhandledRejection', (err) => logger.write('error', `main (promise): ${err?.stack || err}`));
}

module.exports = {
  redact, createLogger, createOutbox, deviceInfo, register, captureLogs,
  MAX_FILE_BYTES, MAX_FILES, LOG_TAIL_BYTES,
};
