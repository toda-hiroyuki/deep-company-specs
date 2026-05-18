import { z } from "zod";
import { checkBookingCutoff } from "./checkBookingCutoff";
import { checkCloseOut } from "./checkCloseOut";
import { checkDailyCapacity } from "./checkDailyCapacity";
import { checkDeparturesPerDay } from "./checkDeparturesPerDay";
import { checkParticipantLimits } from "./checkParticipantLimits";
import { checkScheduleCapacity } from "./checkScheduleCapacity";
import { fetchContext } from "./fetchContext";
import type { AssessmentInput, AssessmentResult } from "./types";

const inputSchema = z
  .object({
    tourId: z.string().min(1),
    scheduleId: z.string().min(1).optional(),
    startDateTime: z.date(),
    requestedGuests: z.number().int().min(1),
    isNewDeparture: z.boolean(),
    now: z.date().optional(),
  })
  .refine((v) => v.scheduleId !== undefined || v.isNewDeparture === true, {
    message: "scheduleId omitted requires isNewDeparture=true",
  });

// Booking acceptance orchestrator. Evaluates five checks in fixed order and
// returns the first NG, or { ok: true } if all pass.
export async function assessBookingAcceptance(
  input: AssessmentInput
): Promise<AssessmentResult> {
  const parsed = inputSchema.parse(input);
  const ctx = await fetchContext({
    tourId: parsed.tourId,
    scheduleId: parsed.scheduleId,
    startDateTime: parsed.startDateTime,
    requestedGuests: parsed.requestedGuests,
    isNewDeparture: parsed.isNewDeparture,
    now: parsed.now ?? new Date(),
  });

  const checks = [
    checkCloseOut,
    checkScheduleCapacity,
    checkDailyCapacity,
    checkDeparturesPerDay,
    checkParticipantLimits,
    checkBookingCutoff,
  ];
  for (const check of checks) {
    const result = check(ctx);
    if (!result.ok) return result;
  }
  return { ok: true };
}
