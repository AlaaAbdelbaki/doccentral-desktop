// The whole UI really is translated: switch language through Settings, visit
// every page and the main dialogs, and fail on any visible Latin-script word
// that isn't user data (names, phones, procedures… read from the database) or
// an allowed proper noun. Screenshots of every screen go into the report.
const path = require('path');
const { pathToFileURL } = require('url');
const { test, expect, snap, nav, modal, sql } = require('./fixtures');

const WORD = /\p{Script=Latin}[\p{Script=Latin}'.-]*/gu;
const words = (s) => (s.match(WORD) || []).map((w) => w.replace(/[.'-]+$/, ''));
// A UI key as a whole-string pattern, its {placeholders} matching anything.
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const keyPattern = (k) => new RegExp(`^${k.split(/\{\w+\}/).map(escapeRe).join('.+')}$`);
const loadLocale = async (lang) => {
  const m = await import(pathToFileURL(path.join(__dirname, '..', '..', 'src', 'lib', 'locales', `${lang}.js`)).href);
  // Playwright transpiles to CommonJS, which can wrap the default export once more.
  const dict = m.default?.default ?? m.default;
  if (!dict || typeof dict.Save !== 'string') throw new Error(`could not load the ${lang} dictionary`);
  return dict;
};

// Proper nouns / technical names shown as-is in every language.
const ALLOWED = new Set(['DocCentral', 'Supabase', 'SQLite', 'SQL', 'English', 'Français', 'FM', 'KB']);

// Every Latin-script word present in the user's data (demo seed included).
async function dataWords(page) {
  const tables = ['clinics', 'users', 'patients', 'appointments', 'visits', 'performed_treatments',
    'planned_treatments', 'invoice_items', 'payments', 'inventory_items', 'attachments', 'roles'];
  const out = new Set();
  for (const table of tables) {
    for (const row of await sql(page, `SELECT * FROM ${table}`)) {
      for (const v of Object.values(row)) if (typeof v === 'string') for (const w of words(v)) out.add(w);
      // Avatars show initials of people's names.
      if (row.first_name !== undefined) out.add(`${(row.first_name || '?')[0]}${(row.last_name || '')[0] || ''}`.toUpperCase());
    }
  }
  return out;
}

// Visible text nodes, input placeholders and <option> labels with Latin words.
const visibleLatin = (page) => page.evaluate(() => {
  const out = [];
  const visible = (el) => !!(el && (el.offsetWidth || el.offsetHeight || el.getClientRects().length));
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const s = n.nodeValue.trim();
    const el = n.parentElement;
    if (s && /\p{Script=Latin}{2,}/u.test(s) && (el.tagName === 'OPTION' || visible(el))) out.push(s);
  }
  for (const el of document.querySelectorAll('input[placeholder], textarea[placeholder]')) {
    if (visible(el) && /\p{Script=Latin}{2,}/u.test(el.placeholder)) out.push(`placeholder: ${el.placeholder}`);
  }
  return out;
});

async function switchLanguage(page, label) {
  await page.locator('.side .nav-item').nth(7).click(); // Settings, whatever the current language
  await page.locator('.settings-nav a').nth(2).click(); // Language
  await page.locator('.setting-row', { hasText: label }).getByRole('button').click();
}

for (const [lang, label, dir] of [['ar', 'العربية', 'rtl'], ['fr', 'Français', 'ltr']]) {
  test(`${lang}: every screen is translated`, async ({ page }) => {
    test.setTimeout(120_000);
    await switchLanguage(page, label);
    await expect(page.locator('html')).toHaveAttribute('dir', dir);
    const data = await dataWords(page);
    // French is written in Latin script too, so instead flag text that is
    // exactly an English UI string the French dictionary translates differently.
    // Source of truth: every key the app uses (from the source scan), not the
    // dictionary itself — a key missing from the dictionary must still count.
    const dict = await loadLocale(lang);
    const { audit } = await import(pathToFileURL(path.join(__dirname, '..', '..', 'scripts', 'i18n-audit.mjs')).href);
    // Each entry: the English pattern, and its translation's pattern (a string
    // matching both — "0 au total" vs "{n} total" — is translated).
    const englishLeft = [...audit().keys.keys()].filter((k) => dict[k] !== k)
      .map((k) => [keyPattern(k), dict[k] ? keyPattern(dict[k]) : null]);
    const offenders = new Map();
    const scan = async (where) => {
      await page.waitForTimeout(250);
      await snap(page, `${lang}-${where}`);
      for (const text of await visibleLatin(page)) {
        const plain = text.replace(/^placeholder: /, '');
        if (lang === 'fr') {
          const isData = words(plain).every((w) => data.has(w) || ALLOWED.has(w));
          const english = englishLeft.some(([en, tr]) => en.test(plain) && !(tr && tr.test(plain)));
          if (english && !isData) offenders.set(`${where}: ${text}`, 'English');
          continue;
        }
        const bad = words(plain).filter((w) => w.length > 1 && !ALLOWED.has(w) && !data.has(w));
        if (bad.length) offenders.set(`${where}: ${text}`, bad.join(' '));
      }
    };
    const closeModal = () => modal(page).locator('.drawer-close').click();
    const navTo = (i) => page.locator('.side .nav-item').nth(i).click();

    // Home
    await navTo(0); await scan('home');
    // Calendar: views, new appointment, appointment actions, cancel dialog
    await navTo(1); await scan('calendar-day');
    await page.locator('.topbar .btn-primary').click(); await scan('calendar-new'); await closeModal();
    await page.locator('.appt').first().click(); await scan('calendar-actions');
    await modal(page).locator('.btn-danger').click(); await scan('calendar-cancel'); await closeModal();
    await page.locator('.seg button').nth(1).click(); await scan('calendar-week');
    await page.locator('.seg button').nth(2).click(); await scan('calendar-month');
    // Patients: list, tabs, add dialog
    await navTo(2); await scan('patients-overview');
    for (const [i, name] of [[1, 'plan'], [2, 'visits'], [3, 'chart']]) {
      await page.locator('.split-detail .card').first().locator('button').nth(1 + i).click();
      await scan(`patients-${name}`);
    }
    await page.locator('.topbar .btn-primary').click(); await scan('patients-add'); await closeModal();
    // Invoices: list, invoice dialog, payment dialog
    await navTo(3); await scan('invoices');
    await page.locator('.dtable tbody tr').first().click(); await scan('invoice');
    const pay = modal(page).locator('.modal-foot .btn-primary').last();
    if (await pay.count()) { await pay.click(); await scan('invoice-payment'); await closeModal(); }
    await closeModal();
    // Documents, Inventory (+ restock / adjust), Day closeout
    await navTo(4); await scan('documents');
    await navTo(5); await scan('inventory');
    await page.locator('.dtable tbody tr').first().locator('button').first().click(); await scan('inventory-restock'); await closeModal();
    await page.locator('.dtable tbody tr').first().locator('button').nth(1).click(); await scan('inventory-adjust'); await closeModal();
    await navTo(6); await scan('closeout');
    // Settings: every section
    await navTo(7);
    for (let i = 0; i < 5; i++) {
      await page.locator('.settings-nav a').nth(i).click();
      await scan(`settings-${i}`);
    }

    expect([...offenders].map(([k, v]) => `${k}  ⟶  ${v}`)).toEqual([]);
  });
}

test('sign-in page offers the language switch and translates', async ({ page }) => {
  // Signed in via dev auto-login; the sign-in screen is reached by signing out.
  await nav(page, 'Settings');
  await page.locator('.settings-nav a', { hasText: 'Data & sync' }).click();
  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.locator('.auth-lang button', { hasText: 'العربية' }).click();
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('.auth-title')).toHaveText('تسجيل الدخول');
  await snap(page, 'signin-ar');
});
