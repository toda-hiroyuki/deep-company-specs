import { prisma } from "@/lib/prisma";
import {
  ACTIVE_SCHEDULE_STATUSES,
  OCCUPYING_BOOKING_STATUSES,
} from "./constants";
import { resolveApplicableRule } from "./resolveApplicableRule";
import { jstDayBoundsUtc, toJstDateKey } from "./timezone";
import { toJstComponents } from "./matchCapacityRuleForStart";
import type {
  AssessmentContext,
  AssessmentInput,
  CapacityRuleSettings,
  ScheduleCapacityContext,
} from "./types";

// Assembles the AssessmentContext consumed by every check function.
// All Prisma access lives here so the check functions stay pure and trivially unit-testable.
export async function fetchContext(
  input: AssessmentInput & { now: Date }
): Promise<AssessmentContext> {
  const tour = await prisma.tour.findUnique({
    where: { id: input.tourId },
    select: {
      maxParticipants: true,
      dailyCapacity: true,
      maxDeparturesPerDay: true,
      bookingCutoffMinutes: true,
    },
  });
  if (!tour) {
    throw new Error(`Tour not found: ${input.tourId}`);
  }

  const ruleRows = await prisma.capacityRule.findMany({
    where: { tourId: input.tourId, isActive: true },
    orderBy: { priority: "desc" },
    select: {
      id: true,
      minParticipants: true,
      maxPerBooking: true,
      minPerBooking: true,
      priority: true,
      isActive: true,
    },
  });
  const rules: CapacityRuleSettings[] = ruleRows;

  let schedule: ScheduleCapacityContext | null = null;
  if (input.scheduleId) {
    const s = await prisma.tourSchedule.findUnique({
      where: { id: input.scheduleId },
      select: { capacity: true, sourceRuleId: true },
    });
    if (!s) {
      throw new Error(`Schedule not found: ${input.scheduleId}`);
    }
    const agg = await prisma.booking.aggregate({
      where: {
        tourScheduleId: input.scheduleId,
        status: { in: [...OCCUPYING_BOOKING_STATUSES] },
      },
      _sum: { numberOfGuests: true },
    });
    schedule = {
      scheduleId: input.scheduleId,
      remainingCapacity: s.capacity,
      currentGuests: agg._sum.numberOfGuests ?? 0,
      sourceRuleId: s.sourceRuleId,
    };
  }

  const dateKey = toJstDateKey(input.startDateTime);
  const { fromUtc, toUtc } = jstDayBoundsUtc(dateKey);
  const daySchedules = await prisma.tourSchedule.findMany({
    where: {
      tourId: input.tourId,
      startDateTime: { gte: fromUtc, lt: toUtc },
      status: { in: [...ACTIVE_SCHEDULE_STATUSES] },
    },
    select: { id: true },
  });
  const departureCount = daySchedules.length;
  let bookedGuests = 0;
  if (daySchedules.length > 0) {
    const agg = await prisma.booking.aggregate({
      where: {
        tourScheduleId: { in: daySchedules.map((s) => s.id) },
        status: { in: [...OCCUPYING_BOOKING_STATUSES] },
      },
      _sum: { numberOfGuests: true },
    });
    bookedGuests = agg._sum.numberOfGuests ?? 0;
  }

  const applicableRule = resolveApplicableRule({
    sourceRuleId: schedule?.sourceRuleId ?? null,
    rules,
  });

  const closeOuts = await prisma.closeOut.findMany({
    where: {
      tourId: input.tourId,
      date: { gte: fromUtc, lt: toUtc },
    },
    select: { startTime: true },
  });
  const isClosed = isClosedAt(closeOuts, input.startDateTime);

  return {
    tour,
    applicableRule,
    schedule,
    daily: { dateKey, bookedGuests, departureCount },
    closeOut: { isClosed },
    now: input.now,
    input,
  };
}

// True if any CloseOut row on the requested JST day blocks the requested
// hour:minute. `startTime=null` represents a full-day block.
function isClosedAt(
  closeOuts: Array<{ startTime: string | null }>,
  startDateTime: Date
): boolean {
  if (closeOuts.length === 0) return false;
  const jst = toJstComponents(startDateTime);
  for (const co of closeOuts) {
    if (co.startTime === null) return true;
    try {
      const t = JSON.parse(co.startTime) as { hour: number; minute: number };
      if (t.hour === jst.hour && t.minute === jst.minute) return true;
    } catch {
      // Corrupted startTime JSON: fall back to "not blocking" (stricter check
      // would risk rejecting legitimate bookings due to bad admin data).
    }
  }
  return false;
}
