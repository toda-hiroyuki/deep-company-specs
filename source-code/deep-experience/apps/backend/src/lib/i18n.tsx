"use client";

import { useCallback } from "react";
import i18next from "i18next";
import { initReactI18next, useTranslation as useI18nextTranslation } from "react-i18next";
import { resources, SUPPORTED_LOCALES } from "@deep-experience/i18n";

export type Locale = (typeof SUPPORTED_LOCALES)[number];

const STORAGE_KEY = "app_locale";

function getStoredLocale(): Locale {
  if (typeof window === "undefined") return "ja";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && (SUPPORTED_LOCALES as readonly string[]).includes(stored)) {
    return stored as Locale;
  }
  const browserLang = navigator.language.split("-")[0];
  if ((SUPPORTED_LOCALES as readonly string[]).includes(browserLang)) {
    return browserLang as Locale;
  }
  return "ja";
}

// Initialize i18next with the app's own instance
if (!i18next.isInitialized) {
  i18next.use(initReactI18next).init({
    resources,
    lng: getStoredLocale(),
    fallbackLng: "en",
    defaultNS: "common",
    ns: ["common", "mobile", "admin"],
    interpolation: { escapeValue: false },
    initImmediate: false,
  });
}

/**
 * Compatibility wrapper around react-i18next's useTranslation.
 * Provides the same API as the old custom i18n hook (useI18n).
 */
export function useI18n() {
  const { t: adminT, i18n } = useI18nextTranslation("admin");
  const { t: commonT } = useI18nextTranslation("common");

  const locale = (i18n.language as Locale) || "ja";

  const setLocale = useCallback((l: Locale) => {
    i18n.changeLanguage(l);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, l);
    }
  }, [i18n]);

  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    const i18nextParams = params ? { ...params } : undefined;

    const adminResult = adminT(key, { ...i18nextParams, defaultValue: "__MISS__" });
    if (adminResult !== "__MISS__") return adminResult;

    const commonResult = commonT(key, { ...i18nextParams, defaultValue: "__MISS__" });
    if (commonResult !== "__MISS__") return commonResult;

    return key;
  }, [adminT, commonT]);

  return { locale, setLocale, t };
}

export { SUPPORTED_LOCALES };
