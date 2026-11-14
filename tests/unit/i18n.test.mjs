// Translation coverage (src/lib/locales): every user-facing string goes
// through t(), every key is translated in French and Arabic, and translations
// keep their {placeholders}. Run the report by hand: node scripts/i18n-audit.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { audit } from '../../scripts/i18n-audit.mjs';
import fr from '../../src/lib/locales/fr.js';
import ar from '../../src/lib/locales/ar.js';
import { t, setCurrentLang, detectLanguage, initialLanguage } from '../../src/lib/translate.js';

const { untranslated, keys } = audit();
const used = [...keys.keys()];
const placeholders = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

test('no user-facing text bypasses the translator', () => {
  assert.deepEqual(untranslated.map((u) => `${u.at} ${u.text}`), []);
});

for (const [name, dict] of [['French', fr], ['Arabic', ar]]) {
  test(`${name}: every key used in the app is translated`, () => {
    assert.deepEqual(used.filter((k) => !(k in dict)), []);
  });

  test(`${name}: translations keep exactly the placeholders of their key`, () => {
    const broken = Object.entries(dict)
      .filter(([k, v]) => placeholders(k).join() !== placeholders(v).join())
      .map(([k, v]) => `${k} → ${v}`);
    assert.deepEqual(broken, []);
  });

  test(`${name}: no unused entries`, () => {
    const usedSet = new Set(used);
    assert.deepEqual(Object.keys(dict).filter((k) => !usedSet.has(k)), []);
  });
}

test('Arabic entries are actually Arabic', () => {
  const notArabic = Object.entries(ar).filter(([, v]) => !/[؀-ۿ]/.test(v)).map(([k]) => k);
  assert.deepEqual(notArabic, []);
});

test('t() translates, fills placeholders, and falls back to English', () => {
  setCurrentLang('fr');
  assert.equal(t('Save'), 'Enregistrer');
  assert.equal(t('{n} pending', { n: 3 }), '3 en attente');
  assert.equal(t('Not a real key {x}', { x: 1 }), 'Not a real key 1');
  setCurrentLang('ar');
  assert.equal(t('Dr. {name}', { name: 'Ben Ammar' }), 'د. Ben Ammar');
  setCurrentLang('en');
  assert.equal(t('Save'), 'Save');
});

test('default language follows the PC: first supported preferred language', () => {
  assert.equal(detectLanguage(['ar-TN']), 'ar');
  assert.equal(detectLanguage(['fr-FR', 'en-US']), 'fr');
  assert.equal(detectLanguage(['fr-CA']), 'fr');             // regional variants
  assert.equal(detectLanguage(['de-DE', 'ar-SA', 'fr-FR']), 'ar'); // order of preference
  assert.equal(detectLanguage(['en-US', 'fr-FR']), 'en');
  assert.equal(detectLanguage(['AR_tn']), 'ar');              // case / underscore
});

test('falls back to English when no preferred language is supported', () => {
  assert.equal(detectLanguage(['de-DE', 'it-IT']), 'en');
  assert.equal(detectLanguage([]), 'en');
  assert.equal(detectLanguage([undefined, '']), 'en');
});

test("a language the user picked wins over the PC's language", () => {
  assert.equal(initialLanguage('fr', ['ar-TN']), 'fr');
  assert.equal(initialLanguage(null, ['ar-TN']), 'ar');
  assert.equal(initialLanguage('xx', ['fr-FR']), 'fr');        // unknown stored value ignored
  assert.equal(initialLanguage(null, ['de-DE']), 'en');
});
