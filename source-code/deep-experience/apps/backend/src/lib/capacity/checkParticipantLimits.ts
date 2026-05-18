import type { AssessmentContext, AssessmentResult } from "./types";

// Check item 4: participant limits.
//
// Tour.maxParticipants (product-wide hard cap) is always enforced, even when
// CapacityRule is absent — this is the safety net the operator can never turn off.
//
// CapacityRule-derived constraints are applied only when an applicable rule exists:
//   - maxPerBooking  : upper bound on a single booking's guest count
//   - minPerBooking  : lower bound on a single booking's guest count
//   - minParticipants: lower bound on the departure-wide headcount after this booking
//
// `totalAfter` is (current guests on the schedule) + (requested guests).
// For new departures (isNewDeparture=true), schedule is null so currentGuests = 0.
export function checkParticipantLimits(
  ctx: AssessmentContext
): AssessmentResult {
  const currentGuests = ctx.schedule?.currentGuests ?? 0;
  const requested = ctx.input.requestedGuests;
  const totalAfter = currentGuests + requested;

  if (totalAfter > ctx.tour.maxParticipants) {
    return { ok: false, reason: "MAX_PARTICIPANTS_EXCEEDED" };
  }

  const rule = ctx.applicableRule;
  if (rule) {
    if (rule.maxPerBooking !== null && requested > rule.maxPerBooking) {
      return { ok: false, reason: "MAX_PARTICIPANTS_EXCEEDED" };
    }
    if (requested < rule.minPerBooking) {
      return { ok: false, reason: "MIN_PARTICIPANTS_NOT_MET" };
    }
    if (totalAfter < rule.minParticipants) {
      return { ok: false, reason: "MIN_PARTICIPANTS_NOT_MET" };
    }
  }

  return { ok: true };
}
