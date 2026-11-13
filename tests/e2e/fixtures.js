// Shared fixtures: launch DocCentral in an isolated data dir with demo data,
// record a video of the whole test, and expose small UI helpers.
const base = require('@playwright/test');
const { _electron: electron } = base;
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

const test = base.test.extend({
  app: async ({}, use, testInfo) => {
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dc-e2e-'));
    const videoDir = testInfo.outputPath('video');
    const app = await electron.launch({
      args: ['.'],
      cwd: ROOT,
      env: { ...process.env, DOC_DEV_AUTOLOGIN: '1', DOC_DATA_DIR: dataDir },
      recordVideo: { dir: videoDir, size: { width: 1440, height: 900 } },
    });
    await use(app);
    await app.close();
    for (const f of fs.existsSync(videoDir) ? fs.readdirSync(videoDir) : []) {
      await testInfo.attach('video', { path: path.join(videoDir, f), contentType: 'video/webm' });
    }
    fs.rmSync(dataDir, { recursive: true, force: true });
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

module.exports = { test, expect: base.expect, snap, nav, modal, field, sql };
