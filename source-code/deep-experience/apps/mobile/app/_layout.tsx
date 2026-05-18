import i18next from "i18next";
import { initReactI18next, useTranslation } from "react-i18next";
import { Stack } from "expo-router";
import { resources, SUPPORTED_LOCALES, type SupportedLocale } from "@deep-experience/i18n";
import { AlertProvider } from "../lib/alert";

// Detect device locale
function getDeviceLocale(): SupportedLocale {
  try {
    const { getLocales } = require("expo-localization");
    const locales = getLocales();
    if (locales && locales.length > 0) {
      const lang = locales[0].languageCode;
      if (lang && (SUPPORTED_LOCALES as readonly string[]).includes(lang)) {
        return lang as SupportedLocale;
      }
    }
  } catch {
    if (typeof navigator !== "undefined" && navigator.language) {
      const lang = navigator.language.split("-")[0];
      if ((SUPPORTED_LOCALES as readonly string[]).includes(lang)) {
        return lang as SupportedLocale;
      }
    }
  }
  return "en";
}

// Initialize i18next with the app's own instance (avoids pnpm dual-instance issue)
i18next.use(initReactI18next).init({
  resources,
  lng: getDeviceLocale(),
  fallbackLng: "en",
  defaultNS: "common",
  ns: ["common", "mobile", "admin"],
  interpolation: { escapeValue: false },
  initImmediate: false,
});

function ScreenOptions() {
  const { t } = useTranslation("mobile");
  const { t: tc } = useTranslation("common");
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="tour/[tourId]"
        options={{ title: t("header.tourDetails"), headerBackTitle: tc("back") }}
      />
      <Stack.Screen
        name="booking/[bookingId]"
        options={{ title: t("header.bookingDetails"), headerBackTitle: tc("back") }}
      />
      <Stack.Screen
        name="notifications"
        options={{ title: tc("notifications"), headerBackTitle: tc("back") }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AlertProvider>
      <ScreenOptions />
    </AlertProvider>
  );
}
