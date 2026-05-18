import { initI18n, SUPPORTED_LOCALES, type SupportedLocale } from "./index";

function getDeviceLocale(): SupportedLocale {
  try {
    // expo-localization - works on native and web
    const { getLocales } = require("expo-localization");
    const locales = getLocales();
    if (locales && locales.length > 0) {
      const lang = locales[0].languageCode;
      if (lang && (SUPPORTED_LOCALES as readonly string[]).includes(lang)) {
        return lang as SupportedLocale;
      }
    }
  } catch {
    // Fallback: detect from browser if expo-localization fails
    if (typeof navigator !== "undefined" && navigator.language) {
      const lang = navigator.language.split("-")[0];
      if ((SUPPORTED_LOCALES as readonly string[]).includes(lang)) {
        return lang as SupportedLocale;
      }
    }
  }
  return "en";
}

export function initI18nNative() {
  const locale = getDeviceLocale();
  return initI18n(locale);
}

export { useTranslation } from "react-i18next";
