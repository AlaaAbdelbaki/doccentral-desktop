// "Report a problem": device information, logs and the screenshot are off by
// default and only included when ticked; the preview shows exactly what goes
// out; personal data is scrubbed from logs. The test app has no cloud account,
// so reports land in the local outbox, which is what we inspect.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { test, expect, snap, modal } = require('./fixtures');

const outbox = (dataDir) => {
  const dir = path.join(dataDir, 'outbox', 'bug-reports');
  return fs.existsSync(dir)
    ? fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')))
    : [];
};
const open = (page) => page.locator('.side-report').click();

test('nothing optional is sent unless the user ticks it', async ({ page, dataDir }) => {
  await open(page);
  const m = modal(page);
  await expect(m.locator('.modal-title')).toHaveText('Report a problem');
  for (const box of [m.locator('#report-device'), m.locator('#report-logs'), m.locator('.report-shot input')]) {
    await expect(box).not.toBeChecked();
  }
  await snap(page, 'report-form');

  // A description is required.
  await m.getByRole('button', { name: 'Send report' }).click();
  await expect(m.locator('.auth-error')).toHaveText('Please describe the problem.');

  await m.locator('textarea').fill('The calendar froze after booking.');
  await m.getByRole('button', { name: 'Send report' }).click();
  await expect(m).toContainText('Report saved on this computer.');
  await snap(page, 'report-queued');

  const [report] = outbox(dataDir);
  expect(report.description).toBe('The calendar froze after booking.');
  expect(report.diagnostics).toBeNull();
  expect(report.logs).toBeNull();
  expect(report.files).toEqual([]);
  expect(report.app_version).toMatch(/^\d+\.\d+\.\d+$/);
});

test('ticked options are included exactly as previewed, without personal data', async ({ page, dataDir }) => {
  // Something personal reaches the log, as an error message might.
  await page.evaluate(() => window.dc.report.log('error', 'save failed for dentist@clinic.tn, phone +216 54 887 210'));

  await open(page);
  const m = modal(page);
  await m.locator('textarea').fill('Invoice total looks wrong.');
  await m.locator('.report-shot input').check();
  await m.locator('#report-device').check();
  await m.locator('#report-logs').check();
  const show = m.getByRole('button', { name: 'Show what will be sent' });
  await show.first().click(); // its label then changes to "Hide…", so the next one becomes first
  await show.first().click();
  await expect(m.locator('.report-preview')).toHaveCount(2);
  const [devicePreview, logPreview] = await m.locator('.report-preview').allTextContents();
  await snap(page, 'report-previews');

  // Device info: technical facts, nothing identifying.
  expect(devicePreview).toContain('"electron"');
  for (const secret of [os.hostname(), os.userInfo().username, dataDir]) {
    expect(devicePreview.toLowerCase()).not.toContain(secret.toLowerCase());
  }
  // Logs: scrubbed.
  expect(logPreview).toContain('save failed for <email>, phone <number>');
  expect(logPreview).not.toContain('dentist@clinic.tn');

  await m.getByRole('button', { name: 'Send report' }).click();
  await expect(m).toContainText('Report saved on this computer.');

  const [report] = outbox(dataDir);
  expect(report.diagnostics.app.version).toMatch(/^\d+\.\d+\.\d+$/);
  expect(JSON.stringify(report.diagnostics, null, 2)).toBe(devicePreview);
  expect(report.logs).toBe(logPreview);
  expect(report.files.map((f) => [f.name, f.type])).toEqual([['screenshot.png', 'image/png']]);
  // The screenshot is of the screen behind the dialog (a real PNG).
  expect(Buffer.from(report.files[0].data, 'base64').subarray(1, 4).toString()).toBe('PNG');
});

test('the form is translated and laid out right-to-left in Arabic', async ({ page }) => {
  await page.locator('.side .nav-item').nth(7).click();
  await page.locator('.settings-nav a').nth(2).click();
  await page.locator('.setting-row', { hasText: 'العربية' }).getByRole('button').click();
  await open(page);
  await expect(modal(page).locator('.modal-title')).toHaveText('الإبلاغ عن مشكلة');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await snap(page, 'report-form-ar');
});
