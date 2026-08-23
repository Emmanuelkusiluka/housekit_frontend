import i18n from "i18next";
import { initReactI18next, useTranslation } from "react-i18next";

import { en } from "./en";
import { sw } from "./sw";

export type Locale = "en" | "sw";
export const LOCALES: { code: Locale; label: string }[] = [
  { code: "en", label: "English" },
  { code: "sw", label: "Kiswahili" },
];

const STORAGE_KEY = "housekit.locale";

export function getStoredLocale(): Locale {
  if (typeof window === "undefined") return "en";
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === "sw" ? "sw" : "en";
}

function isDev(): boolean {
  try {
    return Boolean((import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV);
  } catch {
    return false;
  }
}

export function initI18n(): typeof i18n {
  if (!i18n.isInitialized) {
    i18n.use(initReactI18next).init({
      // Single "translation" namespace → dotted keys (`nav.portfolio`) resolve.
      resources: {
        en: { translation: en as unknown as Record<string, unknown> },
        sw: { translation: sw as unknown as Record<string, unknown> },
      },
      lng: getStoredLocale(),
      fallbackLng: "en",
      interpolation: { escapeValue: false },
      returnNull: false,
      // Dev-only: make any missing key obvious instead of silently rendering raw.
      saveMissing: isDev(),
      missingKeyHandler: (_lngs, _ns, key) => {
        if (isDev()) console.warn(`[i18n] MISSING key: ${key}`);
      },
    });
  }
  return i18n;
}

export function setLocale(locale: Locale) {
  window.localStorage.setItem(STORAGE_KEY, locale);
  void i18n.changeLanguage(locale);
  if (typeof document !== "undefined") document.documentElement.lang = locale;
}

export { useTranslation, i18n };
export { en, sw };
