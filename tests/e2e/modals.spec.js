// Modals never throw away typed data (critical #3): no close on backdrop click
// for forms, "Discard changes?" prompt, visit notes autosave.
const { test, expect, nav, modal, field, sql } = require('./fixtures');

const clickBackdrop = (page) =>
  page.locator('.modal-backdrop').last().click({ position: { x: 5, y: 5 } });

// Check Amira in from today's calendar and open her visit.
async function openVisit(page) {
  await nav(page, 'Calendar');
  await page.locator('.appt', { hasText: 'Amira Ben Salah' }).click();
  await modal(page).getByRole('button', { name: 'Check in' }).click();
  await expect(modal(page)).toContainText('Visit — Amira Ben Salah');
}

const amiraVisit = async (page) => (await sql(page, `SELECT v.diagnosis, v.clinical_notes FROM visits v
  JOIN patients p ON p.id=v.patient_id WHERE p.first_name='Amira' ORDER BY v.started_at DESC LIMIT 1`))[0];

test('visit: a backdrop click keeps the modal open, and notes autosave', async ({ page }) => {
  await openVisit(page);
  await field(page, 'Diagnosis').fill('Irreversible pulpitis #30');
  await clickBackdrop(page);
  await expect(modal(page)).toContainText('Visit — Amira Ben Salah');
  await expect(field(page, 'Diagnosis')).toHaveValue('Irreversible pulpitis #30');

  // Autosave after typing stops — no button pressed.
  await expect(modal(page).locator('.autosave-state')).toHaveText(/Saved/);
  expect((await amiraVisit(page)).diagnosis).toBe('Irreversible pulpitis #30');
});

test('visit: closing with X right after typing still saves the notes', async ({ page }) => {
  await openVisit(page);
  await field(page, 'Clinical notes').fill('Patient anxious, topical applied');
  await modal(page).locator('.drawer-close').click(); // before the autosave delay
  await expect(page.locator('.modal')).toHaveCount(0);
  await expect.poll(async () => (await amiraVisit(page)).clinical_notes).toBe('Patient anxious, topical applied');
});

test('visit: a half-typed treatment asks before being dropped', async ({ page }) => {
  await openVisit(page);
  await modal(page).getByPlaceholder('Procedure (free text)').fill('Root canal');
  await modal(page).locator('.drawer-close').click();
  await expect(modal(page)).toContainText('Discard changes?');
});

test('patient form: closing with changes asks first', async ({ page }) => {
  await nav(page, 'Patients');
  await page.locator('.list-row', { hasText: 'Nadia Karoui' }).click();
  await page.getByRole('button', { name: 'Edit' }).click();
  await field(page, 'Phone').fill('+216 99 000 000');

  await clickBackdrop(page); // outside click: nothing happens
  await expect(modal(page)).toContainText('Edit patient');

  await modal(page).locator('.drawer-close').click();
  await expect(modal(page)).toContainText('Discard changes?');
  await modal(page).getByRole('button', { name: 'Keep editing' }).click();
  await expect(field(page, 'Phone')).toHaveValue('+216 99 000 000');

  await page.keyboard.press('Escape');
  await expect(modal(page)).toContainText('Discard changes?');
  await modal(page).getByRole('button', { name: 'Discard' }).click();
  await expect(page.locator('.modal')).toHaveCount(0);
  const [nadia] = await sql(page, `SELECT phone FROM patients WHERE first_name='Nadia' AND last_name='Karoui'`);
  expect(nadia.phone).not.toBe('+216 99 000 000');
});

test('an untouched form closes straight away', async ({ page }) => {
  await nav(page, 'Patients');
  await page.getByRole('button', { name: 'Add patient' }).click();
  await page.keyboard.press('Escape');
  await expect(page.locator('.modal')).toHaveCount(0);
});

test('read-only appointment summary closes on a backdrop click', async ({ page }) => {
  await nav(page, 'Calendar');
  await page.locator('.appt', { hasText: 'Amira Ben Salah' }).click();
  await expect(modal(page)).toContainText('Amira Ben Salah');
  await clickBackdrop(page);
  await expect(page.locator('.modal')).toHaveCount(0);
});

test('Escape closes only the topmost modal', async ({ page }) => {
  await nav(page, 'Invoices');
  const payable = page.locator('.dtable tbody tr', { hasText: /Unpaid|Partially paid/ }).first();
  await payable.click();
  await modal(page).getByRole('button', { name: 'Record payment' }).click();
  await expect(page.locator('.modal')).toHaveCount(2);
  await page.keyboard.press('Escape'); // untouched payment form
  await expect(page.locator('.modal')).toHaveCount(1);
  await expect(modal(page)).toContainText('Line items');
});
