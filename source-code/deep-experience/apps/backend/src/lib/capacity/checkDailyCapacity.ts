import type { AssessmentContext, AssessmentResult } from "./types";

// Check item 2: daily capacity (Tour.dailyCapacity) measured in JST day buckets.
// null means "no daily limit". bookedGuests is the sum over OCCUPYING_BOOKING_STATUSES
// across every TourSchedule that departs on the same JST day.
export function checkDailyCapacity(ctx: AssessmentContext): AssessmentResult {
  const cap = ctx.tour.dailyCapacity;
  if (cap === null) return { ok: true };

  const totalAfter = ctx.daily.bookedGuests + ctx.input.requestedGuests;
  if (totalAfter > cap) {
    return { ok: false, reason: "DAILY_CAPACITY_EXCEEDED" };
  }
  return { ok: true };
}
