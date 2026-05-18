import type { AssessmentContext, AssessmentResult } from "./types";

// Check item 3: daily departure-count limit (Tour.maxDeparturesPerDay).
// Only applies when creating a new TourSchedule; existing slots don't consume a departure.
// departureCount comes from ACTIVE_SCHEDULE_STATUSES (CANCELLED slots are re-usable).
export function checkDeparturesPerDay(
  ctx: AssessmentContext
): AssessmentResult {
  if (!ctx.input.isNewDeparture) return { ok: true };
  const limit = ctx.tour.maxDeparturesPerDay;
  if (limit === null) return { ok: true };

  const countAfter = ctx.daily.departureCount + 1;
  if (countAfter > limit) {
    return { ok: false, reason: "MAX_DEPARTURES_EXCEEDED" };
  }
  return { ok: true };
}
