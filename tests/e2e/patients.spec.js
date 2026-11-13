// Patient management + treatment plans.
const { test, expect, snap, nav, modal, field, sql } = require('./fixtures');

test.beforeEach(async ({ page }) => nav(page, 'Patients'));

test('add, search, edit and soft-delete a patient', async ({ page }) => {
  await page.getByRole('button', { name: 'Add patient' }).click();
  const save = modal(page).getByRole('button', { name: 'Save' });
  await expect(save).toBeDisabled(); // required fields empty

  await field(page, 'First name').fill('Sami');
  await field(page, 'Last name').fill('Jebali');
  await field(page, 'Date of birth').fill('1990-04-12');
  await field(page, 'Phone').fill('+216 20 111 222');
  await snap(page, 'add-patient-form');
  await save.click();

  await page.getByPlaceholder('Search name or phone…').fill('Jebali');
  await expect(page.locator('.list-row')).toHaveCount(1);
  await page.locator('.list-row', { hasText: 'Sami Jebali' }).click();
  await snap(page, 'patient-detail');

  await page.getByRole('button', { name: 'Edit' }).click();
  await field(page, 'Phone').fill('+216 20 999 888');
  await modal(page).getByRole('button', { name: 'Save' }).click();
  await page.locator('.list-row', { hasText: 'Sami Jebali' }).click(); // see KNOWN BUG below
  await expect(page.locator('.drawer-meta')).toContainText('+216 20 999 888');

  await page.locator('.card-actions').getByRole('button', { name: 'Delete' }).click();
  await modal(page).getByRole('button', { name: 'Delete (soft)' }).click();
  await expect(page.locator('.list-row', { hasText: 'Sami Jebali' })).toHaveCount(0);

  const rows = await sql(page, `SELECT deleted_at FROM patients WHERE last_name='Jebali'`);
  expect(rows[0].deleted_at).not.toBeNull(); // kept for history/sync
});

test('treatment plan: add, then cancel a planned item', async ({ page }) => {
  await page.locator('.list-row', { hasText: 'Yasmine Gharbi' }).click();
  await page.getByRole('button', { name: 'Treatment plan' }).click();
  await page.locator('.card-head').getByRole('button', { name: 'Add' }).click();
  await field(page, 'Procedure (required)').fill('Composite filling');
  await field(page, 'Tooth').fill('14');
  await field(page, 'Estimated fee').fill('95');
  await modal(page).getByRole('button', { name: 'Add to plan' }).click();
  await page.locator('.list-row', { hasText: 'Yasmine Gharbi' }).click(); // see KNOWN BUG below
  await page.getByRole('button', { name: 'Treatment plan' }).click();

  const row = page.locator('.dtable tr', { hasText: 'Composite filling' });
  await expect(row).toContainText('Planned');
  await expect(row.locator('td').first()).toHaveText('2'); // sequence after scaling
  await snap(page, 'plan-added');

  await row.getByRole('button').click(); // cancel (x)
  await page.locator('.list-row', { hasText: 'Yasmine Gharbi' }).click(); // see KNOWN BUG below
  await page.getByRole('button', { name: 'Treatment plan' }).click();
  await expect(row).toContainText('Cancelled');
});

test('dental chart: plan treatment from a tooth', async ({ page }) => {
  await page.locator('.list-row', { hasText: 'Hedi Mzali' }).click();
  await page.getByRole('button', { name: 'Dental chart' }).click();
  await page.locator('.big-tooth', { hasText: /^3$/ }).click();
  await page.getByRole('button', { name: 'Add to plan' }).click();
  await expect(field(page, 'Tooth')).toHaveValue('3');
  await field(page, 'Procedure (required)').fill('Crown prep');
  await modal(page).getByRole('button', { name: 'Add to plan' }).click();
  await page.locator('.list-row', { hasText: 'Hedi Mzali' }).click(); // see KNOWN BUG below
  await page.getByRole('button', { name: 'Dental chart' }).click();
  await expect(page.locator('.big-tooth.watch', { hasText: /^3$/ })).toBeVisible();
  await snap(page, 'chart-planned-tooth');
});

test('KNOWN BUG: saving anything on the Patients page jumps to the first patient', async ({ page }) => {
  test.fail(true, 'PatientsPage subscribes a stale load() closure (selId=null) to onDataChanged');
  await page.locator('.list-row', { hasText: 'Yasmine Gharbi' }).click();
  await page.getByRole('button', { name: 'Treatment plan' }).click();
  await page.locator('.card-head').getByRole('button', { name: 'Add' }).click();
  await field(page, 'Procedure (required)').fill('Sealant');
  await modal(page).getByRole('button', { name: 'Add to plan' }).click();
  await page.waitForTimeout(500);
  await snap(page, 'selection-jumped');
  await expect(page.locator('.list-row.active'), 'selected patient after save')
    .toContainText('Yasmine Gharbi', { timeout: 2000 });
});
