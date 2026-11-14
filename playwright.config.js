// End-to-end tests: drive the real Electron app with Playwright.
// Each test gets a fresh, isolated database seeded with demo data
// (DOC_DEV_AUTOLOGIN), plus step screenshots and a full video.
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',
  globalSetup: require.resolve('./tests/e2e/global-setup.js'),
  outputDir: './test-results',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  workers: 1, // one Electron window at a time keeps videos clean
  retries: process.env.CI ? 1 : 0, // CI runners are slower; a retry absorbs a slow app start
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
});
