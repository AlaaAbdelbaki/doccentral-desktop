// Localization for the React app: English (keys), French, Arabic (RTL).
// The translator itself lives in translate.js (plain JS, also used by the
// data layer and Node tests); this adds the provider that applies the
// language to the document and re-renders the app when it changes.
//
// t() is a plain function so any module can use it. The app root subscribes
// via useLang(), so a language switch re-renders everything and every t()
// call picks up the new language.
import { createContext, useContext, useEffect, useState } from 'react';
import { t, lang, setCurrentLang } from './translate.js';

export { t, lang, locale, isRtl, LANGS } from './translate.js';

const applyToDocument = (l) => {
  document.documentElement.lang = l;
  document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr';
};

const LangContext = createContext({ lang: lang(), t, setLang: () => {} });

export const LangProvider = ({ children }) => {
  const [l, setL] = useState(lang());
  useEffect(() => applyToDocument(l), [l]);
  const setLang = (next) => {
    if (setCurrentLang(next)) setL(next); // module state first, so every t() sees it on re-render
  };
  return <LangContext.Provider value={{ lang: l, t, setLang }}>{children}</LangContext.Provider>;
};

export const useLang = () => useContext(LangContext);
