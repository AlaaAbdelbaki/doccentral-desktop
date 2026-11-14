// Default language: follows the PC's display language (French / Arabic),
// falls back to English otherwise, and a language picked by the user wins and
// is remembered across restarts. The PC language is simulated with --lang.
const { test, expect, snap, launchApp, closeApp } = require('./fixtures');

const NAV_HOME = { en: 'Home', fr: 'Accueil', ar: 'الرئيسية' };
const homeLabel = (page) => page.locator('.side .nav-item').first();
const ready = (page) => page.locator('.side-user-name').waitFor({ timeout: 45_000 });

for (const [systemLanguage, expected, dir] of [
  ['fr-FR', 'fr', 'ltr'],
  ['ar-TN', 'ar', 'rtl'],
  ['fr-CA', 'fr', 'ltr'],
  ['de-DE', 'en', 'ltr'],
  ['en-US', 'en', 'ltr'],
]) {
  test.describe(`PC language ${systemLanguage}`, () => {
    test.use({ systemLanguage });
    test(`opens in ${expected}`, async ({ page }) => {
      await expect(homeLabel(page)).toHaveText(NAV_HOME[expected]);
      await expect(page.locator('html')).toHaveAttribute('lang', expected);
      await expect(page.locator('html')).toHaveAttribute('dir', dir);
      await snap(page, `default-${systemLanguage}`);
    });
  });
}

test("a picked language is remembered and wins over the PC's language", async ({ dataDir }) => {
  test.setTimeout(120_000);
  // 1. Arabic PC: opens in Arabic, "same as this computer" is the active setting.
  let app = await launchApp(dataDir, { systemLanguage: 'ar-TN' });
  let page = await app.firstWindow();
  await ready(page);
  await expect(homeLabel(page)).toHaveText(NAV_HOME.ar);
  await page.locator('.side .nav-item').nth(7).click();
  await page.locator('.settings-nav a').nth(2).click();
  const rows = page.locator('.setting-row');
  await expect(rows.first().locator('.pill')).toBeVisible(); // "same as this computer" active
  await snap(page, 'language-settings-auto');

  // 2. Pick English explicitly; it sticks after a restart on the same Arabic PC.
  await page.locator('.setting-row', { hasText: 'English' }).last().getByRole('button').click();
  await expect(homeLabel(page)).toHaveText(NAV_HOME.en);
  await closeApp(app);
  app = await launchApp(dataDir, { systemLanguage: 'ar-TN' });
  page = await app.firstWindow();
  await ready(page);
  await expect(homeLabel(page)).toHaveText(NAV_HOME.en);

  // 3. Back to "same as this computer": follows the PC again, also after a restart.
  await page.locator('.side .nav-item').nth(7).click();
  await page.locator('.settings-nav a').nth(2).click();
  await page.locator('.setting-row').first().getByRole('button').click();
  await expect(homeLabel(page)).toHaveText(NAV_HOME.ar);
  await closeApp(app);
  app = await launchApp(dataDir, { systemLanguage: 'fr-FR' }); // PC language changed meanwhile
  page = await app.firstWindow();
  await ready(page);
  await expect(homeLabel(page)).toHaveText(NAV_HOME.fr);
  await closeApp(app);
});
