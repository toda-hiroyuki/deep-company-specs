import type { AssessmentContext, AssessmentResult } from "./types";

// Check item 1: time-slot capacity on the existing TourSchedule.
// Skipped when no scheduleId was given (isNewDeparture path has no existing slot yet).
export function checkScheduleCapacity(
  ctx: AssessmentContext
): AssessmentResult {
  if (!ctx.schedule) return { ok: true };
  if (ctx.input.requestedGuests > ctx.schedule.remainingCapacity) {
    return { ok: false, reason: "TIME_SLOT_FULL" };
  }
  return { ok: true };
}
