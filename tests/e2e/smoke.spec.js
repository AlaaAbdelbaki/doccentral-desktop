// Every page loads with demo data and no renderer errors.
const { test, expect, snap, nav } = require('./fixtures');

const PAGES = [
  ['Home', null],
  ['Calendar', 'Calendar'],
  ['Patients', 'Patients'],
  ['Invoices', 'Invoices'],
  ['Documents', 'Documents'],
  ['Inventory', 'Inventory'],
  ['Day closeout', 'Day closeout'],
  ['Settings', 'Settings'],
];

test('all pages render with demo data', async ({ page }) => {
  for (const [label, heading] of PAGES) {
    await nav(page, label);
    await expect(page.locator('.side .nav-item.active')).toContainText(label);
    if (heading) await expect(page.locator('.topbar h1')).toContainText(heading);
    await page.waitForTimeout(300);
    await snap(page, `page-${label}`);
  }
});

test('sidebar badges reflect low stock and outstanding balances', async ({ page }) => {
  // Seed: 3 items at/below threshold, Mohamed owes 70 DT.
  await expect(page.locator('.nav-item', { hasText: 'Inventory' }).locator('.nav-badge')).toHaveText('3');
  await expect(page.locator('.nav-item', { hasText: 'Invoices' }).locator('.nav-badge')).toHaveText('1');
});
