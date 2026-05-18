import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import { resources } from "./resources";

export const SUPPORTED_LOCALES = ["en", "ja"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export { resources };

let initialized = false;

export function initI18n(lng?: string) {
  if (initialized) return i18next;
  i18next.use(initReactI18next).init({
    resources,
    lng: lng || "en",
    fallbackLng: "en",
    defaultNS: "common",
    ns: ["common", "mobile", "admin"],
    interpolation: {
      escapeValue: false,
    },
    // Synchronous init - resources are bundled inline, no async loading
    initImmediate: false,
  });
  initialized = true;
  return i18next;
}

export { i18next };
export { useTranslation } from "react-i18next";
