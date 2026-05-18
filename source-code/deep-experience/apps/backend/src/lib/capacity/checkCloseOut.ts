import type { AssessmentContext, AssessmentResult } from "./types";

// Check item 0: CloseOut blocks the requested (JST date, hour:minute).
// Runs before every other check — a closed-out slot must never admit a booking,
// regardless of remaining capacity or new-departure eligibility.
export function checkCloseOut(ctx: AssessmentContext): AssessmentResult {
  if (ctx.closeOut.isClosed) {
    return { ok: false, reason: "SCHEDULE_CLOSED_OUT" };
  }
  return { ok: true };
}
