// Locale-aware date formatting for guest-facing surfaces.
//
// English keeps the existing "Sun, Apr 26, 01:00 PM" / "Sunday, April 26, 2026, 01:00 PM"
// variants — explicit per the spec.
// Japanese uses one full format: "2026年04月26日（日） 01:00 PM".

import type { Locale } from "@/lib/i18n";

const JA_WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

function formatJa(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const dow = JA_WEEKDAYS[d.getDay()];

  // 12-hour clock with AM/PM (per requested spec)
  const h24 = d.getHours();
  const ampm = h24 < 12 ? "AM" : "PM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const hh = String(h12).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");

  return `${yyyy}年${mm}月${dd}日（${dow}） ${hh}:${mi} ${ampm}`;
}

// Compact: "Sun, Apr 26, 01:00 PM" — used in lists / cards.
export function formatScheduleShort(iso: string, locale: Locale): string {
  const d = new Date(iso);
  if (locale === "ja") return formatJa(d);
  return d.toLocaleDateString("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Long: "Sunday, April 26, 2026, 01:00 PM" — used on detail pages.
export function formatScheduleLong(iso: string, locale: Locale): string {
  const d = new Date(iso);
  if (locale === "ja") return formatJa(d);
  return d.toLocaleDateString("en", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// No-weekday variant: "Apr 26, 01:00 PM" — used in notification timestamps.
export function formatTimestamp(iso: string, locale: Locale): string {
  const d = new Date(iso);
  if (locale === "ja") return formatJa(d);
  return d.toLocaleDateString("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
