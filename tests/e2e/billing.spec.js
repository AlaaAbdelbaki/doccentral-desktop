// Visit → auto draft invoice → finalize → partial / full payment, plus
// regression tests for known billing bugs (marked test.fail until fixed:
// they PASS while the bug exists and will flag once it's fixed).
const { test, expect, snap, nav, modal, sql } = require('./fixtures');

// Check Amira in from today's calendar, start treatment, add one procedure.
async function treatAmira(page, price = '150') {
  await nav(page, 'Calendar');
  await page.locator('.appt', { hasText: 'Amira Ben Salah' }).click();
  await modal(page).getByRole('button', { name: 'Check in' }).click();
  await modal(page).getByRole('button', { name: 'Start treatment' }).click();
  await modal(page).getByPlaceholder('Tooth').fill('30');
  await modal(page).getByPlaceholder('Procedure (free text)').fill('Root canal');
  await modal(page).getByPlaceholder('Price').fill(price);
  await modal(page).getByRole('button', { name: 'Add' }).click();
  await expect(modal(page).locator('.dtable')).toContainText('Root canal');
}

async function openInvoiceFor(page, patient) {
  await nav(page, 'Invoices');
  await page.locator('.dtable tr', { hasText: patient }).first().click();
  await expect(modal(page)).toContainText('Line items');
}

async function pay(page, amount) {
  await modal(page).getByRole('button', { name: 'Record payment' }).click();
  await modal(page).locator('input[type=number]').fill(String(amount));
  await modal(page).getByRole('button', { name: 'Record' }).click();
}

test('visit to paid invoice, end to end', async ({ page }) => {
  await treatAmira(page);
  await snap(page, 'visit-in-progress');
  await modal(page).getByRole('button', { name: 'Complete visit' }).click();
  await expect(modal(page)).toContainText('invoice draft');
  await snap(page, 'visit-completed');
  await modal(page).getByRole('button', { name: 'Close' }).click();

  await openInvoiceFor(page, 'Amira Ben Salah');
  await expect(modal(page).locator('.pill')).toContainText('Draft');
  await modal(page).getByRole('button', { name: 'Add discount' }).click();
  await modal(page).locator('input[type=number]').fill('10');
  await modal(page).getByRole('button', { name: 'Add' }).click();
  await expect(modal(page).locator('.dl-grid')).toContainText('140');
  await modal(page).getByRole('button', { name: 'Finalize' }).click();
  await expect(modal(page).locator('.modal-title .pill')).toContainText('Unpaid');

  await pay(page, 100);
  await expect(modal(page).locator('.modal-title .pill')).toContainText('Partially paid');
  await snap(page, 'invoice-partially-paid');
  await pay(page, 40);
  await expect(modal(page).locator('.modal-title .pill')).toContainText('Paid');
  await snap(page, 'invoice-paid');

  const [plan] = await sql(page, `SELECT COUNT(*) n FROM invoices WHERE status='paid' AND total_amount=140`);
  expect(plan.n).toBe(1);
});

test('void an invoice requires a reason and is audited', async ({ page }) => {
  await openInvoiceFor(page, 'Mohamed Trabelsi');
  await modal(page).getByRole('button', { name: 'Void' }).click();
  await expect(modal(page).getByRole('button', { name: 'Void invoice' })).toBeDisabled();
  await modal(page).locator('input').fill('Billing error');
  await modal(page).getByRole('button', { name: 'Void invoice' }).click();
  await expect(modal(page).locator('.modal-title .pill')).toContainText('Void');
  const audit = await sql(page, `SELECT reason FROM invoice_voids`);
  expect(audit.map((a) => a.reason)).toContain('Billing error');
});

test('KNOWN BUG: re-completing an unlocked visit creates a duplicate invoice', async ({ page }) => {
  test.fail(true, 'visitRepo.complete always inserts a new invoice (src/lib/repos.js)');
  await treatAmira(page);
  await modal(page).getByRole('button', { name: 'Complete visit' }).click();
  await modal(page).getByRole('button', { name: 'Unlock visit' }).click();
  await modal(page).getByRole('button', { name: 'Complete visit' }).click();
  await snap(page, 'visit-recompleted');
  const rows = await sql(page, `SELECT COUNT(*) n FROM invoices i JOIN patients p ON p.id=i.patient_id
    WHERE p.first_name='Amira' AND i.deleted_at IS NULL`);
  expect(rows[0].n, 'invoices for one visit').toBe(1);
});

test('KNOWN BUG: payment larger than the amount due is accepted', async ({ page }) => {
  test.fail(true, 'no overpayment validation in InvoiceModal / invoiceRepo.recordPayment');
  await openInvoiceFor(page, 'Mohamed Trabelsi'); // total 120, paid 50
  await pay(page, 500);
  await snap(page, 'overpaid-invoice');
  const [r] = await sql(page, `SELECT SUM(amount) paid FROM payments WHERE deleted_at IS NULL`);
  expect(r.paid, 'total paid must not exceed invoice total').toBeLessThanOrEqual(120);
});

test('KNOWN BUG: a discount larger than the total produces a negative invoice', async ({ page }) => {
  test.fail(true, 'invoiceRepo.addAdjustment does not cap discounts');
  await treatAmira(page, '50');
  await modal(page).getByRole('button', { name: 'Complete visit' }).click();
  await modal(page).getByRole('button', { name: 'Close' }).click();
  await openInvoiceFor(page, 'Amira Ben Salah');
  await modal(page).getByRole('button', { name: 'Add discount' }).click();
  await modal(page).locator('input[type=number]').fill('80');
  await modal(page).getByRole('button', { name: 'Add' }).click();
  await snap(page, 'negative-invoice');
  const [r] = await sql(page, `SELECT i.total_amount t FROM invoices i JOIN patients p ON p.id=i.patient_id WHERE p.first_name='Amira'`);
  expect(r.t).toBeGreaterThanOrEqual(0);
});
