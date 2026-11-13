// Inventory, day closeout, settings / language.
const { test, expect, snap, nav, modal, field, sql } = require('./fixtures');

test('inventory: restock and adjust are recorded', async ({ page }) => {
  await nav(page, 'Inventory');
  const row = page.locator('tr', { hasText: 'Cotton rolls' });
  await row.getByRole('button', { name: 'Restock' }).click();
  await field(page, 'Quantity added (pack)').fill('10');
  await field(page, 'Supplier').fill('MedSupply');
  await modal(page).getByRole('button', { name: 'Record restock' }).click();
  await expect(row).toContainText('12');

  await row.getByRole('button', { name: 'Adjust' }).click();
  await field(page, 'New on-hand quantity (pack)').fill('11');
  await field(page, 'Reason (required)').fill('Count correction');
  await modal(page).getByRole('button', { name: 'Apply adjustment' }).click();
  await expect(row).toContainText('11');
  await snap(page, 'inventory-after');

  const [adj] = await sql(page, `SELECT old_quantity o, new_quantity n, delta d FROM stock_adjustments`);
  expect(adj).toEqual({ o: 12, n: 11, d: -1 });
  await expect(page.locator('.nav-item', { hasText: 'Inventory' }).locator('.nav-badge')).toHaveText('2');
});

test('day closeout: expected cash, confirm, reopen', async ({ page }) => {
  await nav(page, 'Day closeout');
  await expect(page.locator('.stat', { hasText: 'Expected cash' })).toContainText('50'); // seed cash payment
  await page.getByPlaceholder('0').fill('45');
  await expect(page.locator('.stat', { hasText: 'Delta' })).toContainText('-5');
  await snap(page, 'closeout-form');
  await page.getByRole('button', { name: 'Confirm closeout' }).click();
  await expect(page.getByText('Day closed')).toBeVisible();
  await snap(page, 'day-closed');
  await page.getByRole('button', { name: /Reopen day/ }).click();
  await expect(page.getByRole('button', { name: 'Confirm closeout' })).toBeVisible();
});

test('KNOWN BUG: closing a reopened day again still shows it as open', async ({ page }) => {
  test.fail(true, 'closeoutRepo.forDate returns the first (reopened) row — no ORDER BY');
  await nav(page, 'Day closeout');
  await page.getByPlaceholder('0').fill('50');
  await page.getByRole('button', { name: 'Confirm closeout' }).click();
  await page.getByRole('button', { name: /Reopen day/ }).click();
  await page.getByPlaceholder('0').fill('50');
  await page.getByRole('button', { name: 'Confirm closeout' }).click();
  await page.waitForTimeout(500);
  await snap(page, 'reclosed-day');
  await expect(page.getByText('Day closed')).toBeVisible({ timeout: 3000 });
});

test('settings: switch language to French and Arabic (RTL)', async ({ page }) => {
  await nav(page, 'Settings');
  await page.locator('.settings-nav a', { hasText: 'Language' }).click();
  await page.locator('.setting-row', { hasText: 'Français' }).getByRole('button', { name: 'Switch' }).click();
  await expect(page.locator('.side .nav-item', { hasText: 'Paramètres' })).toBeVisible();
  await snap(page, 'lang-fr');

  await page.locator('.setting-row', { hasText: 'العربية' }).getByRole('button').click();
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await snap(page, 'lang-ar');
  await page.locator('.side .nav-item').nth(3).click(); // Invoices, whatever the label
  await expect(page.locator('.topbar')).toBeVisible();
  await snap(page, 'lang-ar-invoices'); // shows the untranslated invoice screen
});

test('settings: edit clinic profile', async ({ page }) => {
  await nav(page, 'Settings');
  const name = page.locator('.dl-grid div', { hasText: 'Clinic name' }).locator('input');
  await name.fill('Cabinet Test');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.locator('.side-brand-sub')).toHaveText('Cabinet Test');
});
