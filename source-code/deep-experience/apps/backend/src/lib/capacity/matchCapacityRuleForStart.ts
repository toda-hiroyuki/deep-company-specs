import type { CapacityRule } from "@prisma/client";
import { DAILY_AGGREGATION_TIMEZONE } from "./constants";

// JST-aware matcher used by the booking auto-assignment flow when it needs to
// decide which CapacityRule governs a brand-new TourSchedule at a specific
// (date, time). Returns the highest-priority active rule whose date scope
// matches the JST calendar date AND whose startTimes contains the JST hour:minute.

export type CalendarComponents = {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  dayOfWeek: number; // 0=Sun ... 6=Sat
  hour: number; // 0-23
  minute: number; // 0-59
};

const jstFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: DAILY_AGGREGATION_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  weekday: "short",
  hour12: false,
});

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export function toJstComponents(utc: Date): CalendarComponents {
  const parts = jstFormatter.formatToParts(utc);
  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";
  return {
    year: Number(pick("year")),
    month: Number(pick("month")),
    day: Number(pick("day")),
    dayOfWeek: WEEKDAY_INDEX[pick("weekday")] ?? 0,
    // Intl uses "24" for midnight under hour12:false; normalize to 0.
    hour: Number(pick("hour")) % 24,
    minute: Number(pick("minute")),
  };
}

// True if the CapacityRule's date scope admits the given calendar date.
// (Time-of-day is evaluated separately via `matchCapacityRuleForStart`.)
export function doesRuleApplyToDate(
  rule: Pick<
    CapacityRule,
    "ruleType" | "daysOfWeek" | "startDate" | "endDate" | "singleDate"
  >,
  date: Pick<CalendarComponents, "year" | "month" | "day" | "dayOfWeek">
): boolean {
  const daysOfWeek: number[] = safeParse<number[]>(rule.daysOfWeek, []);
  switch (rule.ruleType) {
    case "WEEKLY":
      return daysOfWeek.includes(date.dayOfWeek);
    case "RANGE":
      if (!rule.startDate || !rule.endDate) return false;
      if (!daysOfWeek.includes(date.dayOfWeek)) return false;
      return isDateWithinRange(date, rule.startDate, rule.endDate);
    case "SINGLE":
      if (!rule.singleDate) return false;
      return sameYmd(date, rule.singleDate);
    case "YEARLY":
      if (!rule.startDate) return false;
      return sameMonthDay(date, rule.startDate);
    default:
      return false;
  }
}

export function matchCapacityRuleForStart(params: {
  startDateTime: Date;
  rules: CapacityRule[];
}): CapacityRule | null {
  const jst = toJstComponents(params.startDateTime);
  const candidates = params.rules
    .filter((r) => r.isActive)
    .sort((a, b) => b.priority - a.priority);
  for (const rule of candidates) {
    if (!doesRuleApplyToDate(rule, jst)) continue;
    const startTimes = safeParse<Array<{ hour: number; minute: number }>>(
      rule.startTimes,
      []
    );
    const matches = startTimes.some(
      (t) => t.hour === jst.hour && t.minute === jst.minute
    );
    if (matches) return rule;
  }
  return null;
}

function safeParse<T>(value: string, fallback: T): T {
  try {
    const parsed = JSON.parse(value);
    return parsed as T;
  } catch {
    return fallback;
  }
}

function isDateWithinRange(
  date: Pick<CalendarComponents, "year" | "month" | "day">,
  start: Date,
  end: Date
): boolean {
  const key = date.year * 10000 + date.month * 100 + date.day;
  const startKey = yearMonthDayKey(start);
  const endKey = yearMonthDayKey(end);
  return key >= startKey && key <= endKey;
}

function sameYmd(
  date: Pick<CalendarComponents, "year" | "month" | "day">,
  other: Date
): boolean {
  return yearMonthDayKey(other) === date.year * 10000 + date.month * 100 + date.day;
}

function sameMonthDay(
  date: Pick<CalendarComponents, "month" | "day">,
  other: Date
): boolean {
  return other.getUTCMonth() + 1 === date.month && other.getUTCDate() === date.day;
}

function yearMonthDayKey(d: Date): number {
  return (
    d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate()
  );
}
