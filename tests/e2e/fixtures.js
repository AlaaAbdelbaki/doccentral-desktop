// Shared fixtures: launch DocCentral in an isolated data dir with demo data,
// record a video of the whole test, and expose small UI helpers.
const base = require('@playwright/test');
const { _electron: electron } = base;
const fs = require('fs');
const { spawnSync } = require('child_process');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

// Launch the app on a data dir, simulating a PC whose display language is
// `systemLanguage` (Chromium's --lang switch drives navigator.language).
const launchApp = (dataDir, { systemLanguage = 'en-US', videoDir } = {}) => electron.launch({
  args: ['.', `--lang=${systemLanguage}`],
  cwd: ROOT,
  env: { ...process.env, DOC_DEV_AUTOLOGIN: '1', DOC_DATA_DIR: dataDir },
  ...(videoDir ? { recordVideo: { dir: videoDir, size: { width: 1440, height: 900 } } } : {}),
});

// Quit the app, but never let a stuck quit hang the run. On the Windows CI
// runner Electron occasionally fails to exit after a passing test; waiting
// out the 60 s timeout then fails the whole job. After 15 s the process is
// killed and a warning is added to the report so a real hang stays visible.
const CLOSE_TIMEOUT_MS = 15_000;
const closeApp = async (app) => {
  const proc = app.process();
  let timer;
  const closed = await Promise.race([
    app.close().then(() => true, () => true),
    new Promise((resolve) => { timer = setTimeout(() => resolve(false), CLOSE_TIMEOUT_MS); }),
  ]);
  clearTimeout(timer);
  if (closed) return;
  // Kill the whole tree: on Windows the renderer/GPU children otherwise keep
  // running, hold the data dir open and keep the worker from exiting.
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(proc.pid), '/T', '/F'], { stdio: 'ignore' });
  } else {
    try { proc.kill('SIGKILL'); } catch { /* already gone */ }
  }
  const info = base.test.info();
  info.annotations.push({ type: 'warning', description: `Electron did not quit within ${CLOSE_TIMEOUT_MS / 1000} s; process killed` });
  console.warn(`[e2e] ${info.title}: Electron did not quit within ${CLOSE_TIMEOUT_MS / 1000} s; killed`);
};

const test = base.test.extend({
  // The PC language the app sees. English by default so the suite behaves the
  // same on any machine (a French Windows would otherwise open in French).
  systemLanguage: ['en-US', { option: true }],

  dataDir: async ({}, use) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dc-e2e-'));
    await use(dir);
    // Best effort: a just-killed app may still hold files for a moment.
    try { fs.rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 }); } catch { /* temp dir */ }
  },

  app: async ({ dataDir, systemLanguage }, use, testInfo) => {
    const videoDir = testInfo.outputPath('video');
    const app = await launchApp(dataDir, { systemLanguage, videoDir });
    await use(app);
    await closeApp(app);
    for (const f of fs.existsSync(videoDir) ? fs.readdirSync(videoDir) : []) {
      await testInfo.attach('video', { path: path.join(videoDir, f), contentType: 'video/webm' });
    }
  },

  page: async ({ app }, use, testInfo) => {
    const page = await app.firstWindow();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    // Wait for auto-login + demo seed to finish (sidebar user name shows up).
    await base.expect(page.locator('.side-user-name')).toHaveText(/Karim/, { timeout: 45_000 });
    await use(page);
    await testInfo.attach('final', { body: await page.screenshot(), contentType: 'image/png' });
    base.expect(errors, 'uncaught renderer errors').toEqual([]);
  },
});

// Take a named screenshot and attach it to the report.
const snap = async (page, name) =>
  test.info().attach(name, { body: await page.screenshot(), contentType: 'image/png' });

// Navigate via the sidebar.
const nav = (page, label) => page.locator('.side .nav-item', { hasText: label }).click();

// Topmost open modal (invoice modal nests payment modals inside it).
const modal = (page) => page.locator('.modal').last();

// Form control next to a <label> with exact text inside the topmost modal.
const field = (page, label) =>
  modal(page).locator('.field')
    .filter({ has: page.locator('label', { hasText: new RegExp(`^${label.replace(/[()]/g, '\\$&')}$`) }) })
    .locator('input, select, textarea').first();

// Raw SQL against the app's local DB (via the preload bridge) for assertions.
const sql = (page, query, params = []) => page.evaluate(([q, p]) => window.dc.db.all(q, p), [query, params]);

module.exports = { test, expect: base.expect, snap, nav, modal, field, sql, launchApp, closeApp };
