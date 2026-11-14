// Translator core (no React), usable from any module including Node tests.
//
//   t('Save')                     → translated text (falls back to English)
//   t('{n} pending', { n: 3 })    → placeholders filled after translation
//   locale()                      → BCP-47 locale for dates/numbers
import fr from './locales/fr.js';
import ar from './locales/ar.js';

const DICT = { en: {}, fr, ar };
const LOCALES = { en: 'en-GB', fr: 'fr-TN', ar: 'ar-TN' };
export const LANGS = Object.keys(DICT);

const stored = () => {
  try { return globalThis.localStorage?.getItem('dc-lang'); } catch { return null; }
};
let current = DICT[stored()] ? stored() : 'en';

export const lang = () => current;
export const locale = () => LOCALES[current];
export const isRtl = () => current === 'ar';

export function setCurrentLang(next) {
  if (!DICT[next]) return false;
  current = next;
  try { globalThis.localStorage?.setItem('dc-lang', next); } catch {}
  return true;
}

export function t(key, params) {
  let s = DICT[current][key] ?? key;
  if (params) s = s.replace(/\{(\w+)\}/g, (m, name) => (name in params ? String(params[name]) : m));
  return s;
}
