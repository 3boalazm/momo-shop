import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { translations, type Lang, type TranslationKey } from "@/i18n/translations";

type TranslateParams = Record<string, string | number>;

interface LanguageContextValue {
  lang: Lang;
  dir: "ltr" | "rtl";
  t: (key: TranslationKey, params?: TranslateParams) => string;
  setLang: (lang: Lang) => void;
  toggleLang: () => void;
}

function interpolate(str: string, params?: TranslateParams): string {
  if (!params) return str;
  return Object.entries(params).reduce(
    (acc, [k, v]) => acc.replaceAll(`{${k}}`, String(v)),
    str
  );
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

const STORAGE_KEY = "momo_lang";

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "ar" || saved === "en") return saved;
    } catch { /* ignore */ }
    return "en";
  });

  const dir = lang === "ar" ? "rtl" : "ltr";

  // Reflect language + direction on <html> so CSS and native elements follow
  useEffect(() => {
    const html = document.documentElement;
    html.setAttribute("lang", lang);
    html.setAttribute("dir", dir);
    try { localStorage.setItem(STORAGE_KEY, lang); } catch { /* ignore */ }
  }, [lang, dir]);

  const setLang = (l: Lang) => setLangState(l);
  const toggleLang = () => setLangState((prev) => (prev === "en" ? "ar" : "en"));

  const t = (key: TranslationKey, params?: TranslateParams): string => {
    const str = translations[lang][key] ?? translations.en[key] ?? key;
    return interpolate(str, params);
  };

  return (
    <LanguageContext.Provider value={{ lang, dir, t, setLang, toggleLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    // Safe fallback so components don't crash if provider is missing
    return {
      lang: "en" as Lang,
      dir: "ltr" as const,
      t: (key: TranslationKey, params?: TranslateParams) => interpolate(translations.en[key] ?? key, params),
      setLang: () => {},
      toggleLang: () => {},
    };
  }
  return ctx;
}
