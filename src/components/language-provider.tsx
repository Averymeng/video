"use client";

import { createContext, useContext, useState } from "react";
import { dict } from "@/lib/i18n";
import type { Dict, Locale } from "@/lib/i18n";

interface LanguageContextValue {
  locale: Locale;
  t: Dict;
  setLocale: (locale: Locale) => void;
}

const LanguageContext = createContext<LanguageContextValue>({
  locale: "zh",
  t: dict.zh,
  setLocale: () => {},
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window === "undefined") return "zh";
    const saved = localStorage.getItem("locale");
    return saved === "zh" || saved === "en" ? saved : "zh";
  });

  const setLocale = (next: Locale) => {
    setLocaleState(next);
    localStorage.setItem("locale", next);
  };

  return (
    <LanguageContext.Provider value={{ locale, t: dict[locale], setLocale }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
