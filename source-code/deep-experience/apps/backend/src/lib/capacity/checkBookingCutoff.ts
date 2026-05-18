import type { AssessmentContext, AssessmentResult } from "./types";

export type BookingCutoffInput = {
  startDateTime: Date;
  bookingCutoffMinutes: number | null;
  now: Date;
};

// Pure, context-free cutoff judgment.
// Reused from both the assessBookingAcceptance chain (via checkBookingCutoff)
// and the read-only Traveler APIs (/schedules, /availability) so that cutoff
// truth stays single-sourced on the server.
// bookingCutoffMinutes=null  → never closed
// bookingCutoffMinutes=0     → accepted up to the instant of departure
// Boundary rule: exceeded only when `(start - now) / 60000 < cutoff`
// (i.e. equality is still open).
export function isBookingCutoffExceeded(input: BookingCutoffInput): boolean {
  if (input.bookingCutoffMinutes === null) return false;
  const diffMin =
    (input.startDateTime.getTime() - input.now.getTime()) / (60 * 1000);
  return diffMin < input.bookingCutoffMinutes;
}

// Check item 5: booking cutoff window (Tour.bookingCutoffMinutes).
// Uses a UTC-based subtraction — no timezone conversion is needed (Issue #1 decision).
export function checkBookingCutoff(ctx: AssessmentContext): AssessmentResult {
  const exceeded = isBookingCutoffExceeded({
    startDateTime: ctx.input.startDateTime,
    bookingCutoffMinutes: ctx.tour.bookingCutoffMinutes,
    now: ctx.now,
  });
  return exceeded
    ? { ok: false, reason: "BOOKING_CUTOFF_EXCEEDED" }
    : { ok: true };
}
