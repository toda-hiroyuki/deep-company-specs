import { NextRequest } from "next/server";

export type SupportedLocale = "ja" | "en";
const SUPPORTED: SupportedLocale[] = ["ja", "en"];
const DEFAULT_LOCALE: SupportedLocale = "en";

// Resolve the caller's preferred locale.
//   1. ?lang= query param wins (explicit, set by client from useI18n().locale).
//   2. Accept-Language header is checked next (graceful for direct API hits).
//   3. Falls back to "en" so existing English-only consumers keep working.
export function resolveLocale(req: NextRequest): SupportedLocale {
  const fromQuery = new URL(req.url).searchParams.get("lang");
  if (fromQuery && (SUPPORTED as string[]).includes(fromQuery)) {
    return fromQuery as SupportedLocale;
  }

  const header = req.headers.get("accept-language");
  if (header) {
    // "ja-JP,ja;q=0.9,en;q=0.8" → walk preferences left-to-right
    for (const part of header.split(",")) {
      const tag = part.split(";")[0].trim().toLowerCase();
      const primary = tag.split("-")[0];
      if ((SUPPORTED as string[]).includes(primary)) {
        return primary as SupportedLocale;
      }
    }
  }

  return DEFAULT_LOCALE;
}

// Pick a localized variant from a record that has both ja-default and *En fields.
// Returns the chosen string, falling back to the other locale if the requested
// one is empty (so partially-translated tours still display *something*).
export function pickLocalized(
  locale: SupportedLocale,
  jaValue: string | null | undefined,
  enValue: string | null | undefined
): string {
  if (locale === "ja") return (jaValue || enValue || "").trim();
  return (enValue || jaValue || "").trim();
}
