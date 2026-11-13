// Calendar: booking, slot-conflict warning, cancel / reschedule.
const { test, expect, snap, nav, modal, field, sql } = require('./fixtures');

test.beforeEach(async ({ page }) => nav(page, 'Calendar'));

test('book a free slot', async ({ page }) => {
  await page.getByRole('button', { name: 'New appointment' }).click();
  await field(page, 'Patient').selectOption({ label: 'Nadia Karoui' });
  await field(page, 'Start').fill('12:30');
  await field(page, 'End').fill('13:00');
  await field(page, 'Reason / planned treatment').fill('Recall cleaning');
  await expect(modal(page).locator('.warn-banner')).toHaveCount(0);
  await snap(page, 'new-appointment');
  await modal(page).getByRole('button', { name: 'Save' }).click();
  await expect(page.locator('.appt', { hasText: 'Nadia Karoui' })).toBeVisible();
  await snap(page, 'calendar-with-new-appt');
});

test('warns on a double-booked slot', async ({ page }) => {
  await page.getByRole('button', { name: 'New appointment' }).click();
  await field(page, 'Start').fill('09:15'); // overlaps Amira 09:00–10:00
  await field(page, 'End').fill('09:45');
  await expect(modal(page).locator('.warn-banner')).toContainText('Amira Ben Salah');
  await expect(modal(page).getByRole('button', { name: 'Book anyway' })).toBeVisible();
  await snap(page, 'slot-conflict');
});

test('rejects end time before start time', async ({ page }) => {
  await page.getByRole('button', { name: 'New appointment' }).click();
  await field(page, 'Start').fill('15:00');
  await field(page, 'End').fill('14:00');
  await expect(modal(page)).toContainText('End time must be after the start time');
  await expect(modal(page).getByRole('button', { name: /Save|Book anyway/ })).toBeDisabled();
});

test('reschedule creates a linked replacement appointment', async ({ page }) => {
  await page.locator('.appt', { hasText: 'Lina Chaabane' }).click();
  await modal(page).getByRole('button', { name: 'Cancel / reschedule' }).click();
  await field(page, 'Reason').selectOption('rescheduled');
  await snap(page, 'reschedule-form');
  await modal(page).getByRole('button', { name: 'Confirm cancellation' }).click();

  const [orig] = await sql(page, `SELECT a.* FROM appointments a JOIN patients p ON p.id=a.patient_id
    WHERE p.first_name='Lina' AND a.status='rescheduled'`);
  expect(orig.rescheduled_to_appointment_id).toBeTruthy();
  const [rep] = await sql(page, `SELECT status FROM appointments WHERE id=?`, [orig.rescheduled_to_appointment_id]);
  expect(rep.status).toBe('scheduled');
  const audit = await sql(page, `SELECT reason FROM appointment_cancellations WHERE appointment_id=?`, [orig.id]);
  expect(audit[0].reason).toBe('rescheduled');
});

test('week and month views', async ({ page }) => {
  await page.locator('.seg').getByRole('button', { name: 'Week' }).click();
  await expect(page.locator('.appt', { hasText: 'Amira Ben Salah' })).toBeVisible();
  await snap(page, 'week-view');
  await page.locator('.seg').getByRole('button', { name: 'Month' }).click();
  await expect(page.locator('.pill', { hasText: /appts?/ }).first()).toBeVisible();
  await snap(page, 'month-view');
});
