import { initI18n, i18next, SUPPORTED_LOCALES, type SupportedLocale } from "./index";

const STORAGE_KEY = "app_locale";

function getStoredLocale(): SupportedLocale {
  if (typeof window === "undefined") return "ja";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && (SUPPORTED_LOCALES as readonly string[]).includes(stored)) {
    return stored as SupportedLocale;
  }
  // Detect from browser
  const browserLang = navigator.language.split("-")[0];
  if ((SUPPORTED_LOCALES as readonly string[]).includes(browserLang)) {
    return browserLang as SupportedLocale;
  }
  return "ja";
}

export function initI18nWeb() {
  const locale = getStoredLocale();
  return initI18n(locale);
}

export function changeLocale(locale: SupportedLocale) {
  i18next.changeLanguage(locale);
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, locale);
  }
}

export function getCurrentLocale(): SupportedLocale {
  return (i18next.language as SupportedLocale) ?? "ja";
}

export { useTranslation } from "react-i18next";
export type { SupportedLocale } from "./index";
export { SUPPORTED_LOCALES } from "./index";
