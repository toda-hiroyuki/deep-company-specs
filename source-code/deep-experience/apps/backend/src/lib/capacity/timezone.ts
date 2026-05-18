import { DAILY_AGGREGATION_TIMEZONE } from "./constants";

// sv-SE locale formats dates as YYYY-MM-DD which matches our JST day-key format.
const jstDateFormatter = new Intl.DateTimeFormat("sv-SE", {
  timeZone: DAILY_AGGREGATION_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function toJstDateKey(utc: Date): string {
  return jstDateFormatter.format(utc);
}

// JST has no DST, so the UTC boundary of a JST day is derived by a fixed +09:00 offset.
export function jstDayBoundsUtc(dateKey: string): {
  fromUtc: Date;
  toUtc: Date;
} {
  const fromUtc = new Date(`${dateKey}T00:00:00+09:00`);
  const toUtc = new Date(fromUtc.getTime() + 24 * 60 * 60 * 1000);
  return { fromUtc, toUtc };
}
