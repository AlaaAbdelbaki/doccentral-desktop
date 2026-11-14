// Busy buttons, error toasts and the error screen (critical #6 UI part,
// medium #14). Faults are injected with the DOC_FAULT test hook.
const { test, expect, nav, modal, sql } = require('./fixtures');

const amiraVisits = (page) => sql(page, `SELECT v.id FROM visits v JOIN patients p ON p.id=v.patient_id
  WHERE p.first_name='Amira' AND v.deleted_at IS NULL`);

async function openAmira(page) {
  await nav(page, 'Calendar');
  await page.locator('.appt', { hasText: 'Amira Ben Salah' }).click();
}

test('double-clicking "Check in" creates one visit', async ({ page }) => {
  await openAmira(page);
  await modal(page).getByRole('button', { name: 'Check in' }).dblclick();
  await expect(modal(page)).toContainText('Visit — Amira Ben Salah');
  expect(await amiraVisits(page)).toHaveLength(1);
});

test('double-clicking "Complete visit" creates one invoice', async ({ page }) => {
  await openAmira(page);
  await modal(page).getByRole('button', { name: 'Check in' }).click();
  await modal(page).getByRole('button', { name: 'Start treatment' }).click();
  await modal(page).getByPlaceholder('Procedure (free text)').fill('Scaling');
  await modal(page).getByPlaceholder('Price').fill('60');
  await modal(page).getByRole('button', { name: 'Add' }).click();
  await expect(modal(page).locator('.dtable')).toContainText('Scaling');
  await modal(page).getByRole('button', { name: 'Complete visit' }).dblclick();
  await expect(modal(page)).toContainText('invoice: Draft');
  const [{ id }] = await amiraVisits(page);
  expect(await sql(page, `SELECT id FROM invoices WHERE visit_id=? AND deleted_at IS NULL`, [id])).toHaveLength(1);
});

test('an unhandled background error shows a toast', async ({ page }) => {
  await page.evaluate(() => { Promise.reject(new Error('Background failure')); });
  const toast = page.locator('.toast.error');
  await expect(toast).toContainText('Something went wrong');
  await expect(toast).toContainText('Background failure');
  await toast.getByRole('button', { name: 'Dismiss' }).click();
  await expect(toast).toHaveCount(0);
});

test.describe('a failing action', () => {
  test.use({ faults: 'checkIn' });

  test('shows an error toast and the button works again', async ({ page }) => {
    await openAmira(page);
    const checkIn = modal(page).getByRole('button', { name: 'Check in' });
    await checkIn.click();
    const toast = page.locator('.toast.error');
    await expect(toast).toContainText('Something went wrong');
    await expect(toast).toContainText('Injected test fault: checkIn');
    await expect(checkIn).toBeEnabled(); // not stuck busy
    expect(await amiraVisits(page)).toHaveLength(0);
  });
});

test.describe('a page that crashes while rendering', () => {
  test.use({ faults: 'render:inventory', expectedPageErrors: [/^Injected test fault: render:inventory$/] });

  test('shows the error screen with Reload, Home and a pre-filled report', async ({ page }) => {
    await nav(page, 'Inventory');
    const screen = page.locator('.error-screen');
    await expect(screen.getByRole('heading', { name: 'Something went wrong' })).toBeVisible();
    await expect(screen).toContainText('Injected test fault: render:inventory');
    await expect(screen.getByRole('button', { name: 'Reload' })).toBeVisible();

    await screen.getByRole('button', { name: 'Report a problem' }).click();
    await expect(modal(page).locator('textarea')).toHaveValue(/Injected test fault: render:inventory/);
    await modal(page).getByRole('button', { name: 'Cancel' }).click(); // untouched pre-fill: closes directly
    await expect(page.locator('.modal')).toHaveCount(0);

    await screen.getByRole('button', { name: 'Back to Home' }).click();
    await expect(page.locator('.error-screen')).toHaveCount(0);
    await expect(page.locator('.side .nav-item.active')).toContainText('Home');
  });
});
