import { createContext, useContext, useState } from 'react';
import { translate } from '../i18n';
import type { Lang } from '../i18n';

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
}

const LangContext = createContext<LangCtx>({ lang: 'nl', setLang: () => {}, t: k => k });

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = localStorage.getItem('dehaan-lang');
    return saved === 'en' ? 'en' : 'nl';
  });

  function setLang(l: Lang) {
    setLangState(l);
    localStorage.setItem('dehaan-lang', l);
  }

  return (
    <LangContext.Provider value={{ lang, setLang, t: key => translate(key, lang) }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}
