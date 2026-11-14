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

const STORAGE_KEY = 'dc-lang';
const stored = () => {
  try { return globalThis.localStorage?.getItem(STORAGE_KEY); } catch { return null; }
};

// First of the given language tags (e.g. ['fr-FR']) that the app supports,
// matched on the base language; English if none is supported.
export function detectLanguage(preferred = []) {
  for (const tag of preferred) {
    const base = String(tag || '').toLowerCase().split(/[-_]/)[0];
    if (DICT[base]) return base;
  }
  return 'en';
}

// The user's explicit choice wins; otherwise follow the PC's language.
export const initialLanguage = (storedChoice, preferred) =>
  (DICT[storedChoice] ? storedChoice : detectLanguage(preferred));

// The PC's display language: in Electron, navigator.language is the Windows
// display language. Only that one counts — a German PC with French as an
// extra language opens in English, not French.
const systemLanguages = () => {
  const primary = globalThis.navigator?.language;
  return primary ? [primary] : [];
};

let current = initialLanguage(stored(), systemLanguages());
export const systemLanguage = () => detectLanguage(systemLanguages());
export const hasExplicitChoice = () => !!DICT[stored()];

export const lang = () => current;
export const locale = () => LOCALES[current];
export const isRtl = () => current === 'ar';

// Explicit choice (Settings / sign-in screen): remembered across restarts.
// Pass null to forget it and follow the PC's language again.
export function setCurrentLang(next) {
  if (next === null) {
    try { globalThis.localStorage?.removeItem(STORAGE_KEY); } catch {}
    current = systemLanguage();
    return true;
  }
  if (!DICT[next]) return false;
  current = next;
  try { globalThis.localStorage?.setItem(STORAGE_KEY, next); } catch {}
  return true;
}

export function t(key, params) {
  let s = DICT[current][key] ?? key;
  if (params) s = s.replace(/\{(\w+)\}/g, (m, name) => (name in params ? String(params[name]) : m));
  return s;
}
