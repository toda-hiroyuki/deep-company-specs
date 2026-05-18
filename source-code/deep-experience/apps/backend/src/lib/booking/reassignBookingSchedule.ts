import type { Booking, TourSchedule } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  assessBookingAcceptance,
  matchCapacityRuleForStart,
  toJstComponents,
} from "@/lib/capacity";
import {
  ACTIVE_SCHEDULE_STATUSES,
  OCCUPYING_BOOKING_STATUSES,
} from "@/lib/capacity/constants";
import type { BookingRejectionReason } from "@/lib/capacity/types";
import { PrivateScheduleAlreadyBookedError } from "./errors";
import { isDepartureFinalized } from "./isDepartureFinalized";
import {
  normalizeToMinutePrecision,
  resolveInitialCapacity,
} from "./resolveScheduleAssignment";

// Manual booking-to-schedule reassignment service (Issue: [グループ] 予約の催行回 手動変更UI).
//
// Two target shapes are supported:
//   - EXISTING: attach the booking to a pre-existing TourSchedule (same tour).
//   - NEW: spawn a new TourSchedule at a chosen startDateTime (durationMinutes-derived end if omitted).
//
// The acceptance pipeline from Issue #2 (assessBookingAcceptance) is reused as-is.
// Self-exclusion that the pipeline cannot express directly (the booking already
// occupies a seat on the day) is fixed up at the wrapper level so the shared
// pipeline stays untouched.

export type ReassignTarget =
  | { kind: "EXISTING"; scheduleId: string }
  | { kind: "NEW"; startDateTime: Date; endDateTime?: Date };

export type ReassignInput = {
  bookingId: string;
  target: ReassignTarget;
  now?: Date;
};

export type ReassignReason =
  | BookingRejectionReason
  | "BOOKING_NOT_FOUND"
  | "SCHEDULE_NOT_FOUND"
  | "BOOKING_FINALIZED"
  | "TARGET_SAME_AS_CURRENT"
  | "TOUR_MISMATCH"
  | "BOOKING_NOT_ACTIVE"
  | "TARGET_SCHEDULE_INACTIVE";

export type ReassignSuccess = {
  ok: true;
  booking: Booking;
  oldScheduleId: string;
  newSchedule: TourSchedule;
};

export type ReassignResult =
  | ReassignSuccess
  | { ok: false; reason: ReassignReason };

const NON_REASSIGNABLE_STATUSES = new Set([
  "CANCELLED",
  "EXPIRED",
  "COMPLETED",
  "IN_PROGRESS",
]);

export async function reassignBookingSchedule(
  input: ReassignInput
): Promise<ReassignResult> {
  const now = input.now ?? new Date();

  const booking = await prisma.booking.findUnique({
    where: { id: input.bookingId },
    include: {
      tourSchedule: {
        include: {
          tour: {
            include: {
              capacityRules: {
                where: { isActive: true },
                orderBy: { priority: "desc" },
              },
            },
          },
        },
      },
    },
  });
  if (!booking) return { ok: false, reason: "BOOKING_NOT_FOUND" };
  // On-read FINALIZE guard: even if the batch has not yet flipped the state
  // to FINALIZED, once the free-cancellation deadline has passed the booking
  // is semantically finalized and must not be reassigned. Evaluated before
  // the DB-value check so batch lag never opens a reassignment window.
  if (
    isDepartureFinalized({
      startDateTime: booking.tourSchedule.startDateTime,
      freeCancellationDeadlineHours:
        booking.tourSchedule.tour.freeCancellationDeadlineHours,
      now,
    })
  ) {
    return { ok: false, reason: "BOOKING_FINALIZED" };
  }
  if (booking.assignmentState === "FINALIZED") {
    return { ok: false, reason: "BOOKING_FINALIZED" };
  }
  if (NON_REASSIGNABLE_STATUSES.has(booking.status)) {
    return { ok: false, reason: "BOOKING_NOT_ACTIVE" };
  }

  const tour = booking.tourSchedule.tour;
  const oldScheduleId = booking.tourScheduleId;
  const oldStart = booking.tourSchedule.startDateTime;
  const headcount = booking.numberOfGuests;

  let normalizedStart: Date;
  let endDateTime: Date;
  let isNewDeparture: boolean;
  let existingTargetId: string | undefined;

  if (input.target.kind === "EXISTING") {
    if (input.target.scheduleId === oldScheduleId) {
      return { ok: false, reason: "TARGET_SAME_AS_CURRENT" };
    }
    const target = await prisma.tourSchedule.findUnique({
      where: { id: input.target.scheduleId },
      select: {
        id: true,
        tourId: true,
        startDateTime: true,
        endDateTime: true,
        status: true,
      },
    });
    if (!target) return { ok: false, reason: "SCHEDULE_NOT_FOUND" };
    if (target.tourId !== tour.id) {
      return { ok: false, reason: "TOUR_MISMATCH" };
    }
    if (
      !ACTIVE_SCHEDULE_STATUSES.includes(
        target.status as (typeof ACTIVE_SCHEDULE_STATUSES)[number]
      )
    ) {
      return { ok: false, reason: "TARGET_SCHEDULE_INACTIVE" };
    }
    normalizedStart = target.startDateTime;
    endDateTime = target.endDateTime;
    isNewDeparture = false;
    existingTargetId = target.id;
  } else {
    normalizedStart = normalizeToMinutePrecision(input.target.startDateTime);
    endDateTime = input.target.endDateTime
      ? new Date(input.target.endDateTime)
      : new Date(
          normalizedStart.getTime() + tour.durationMinutes * 60 * 1000
        );
    isNewDeparture = true;
    // Spawning a new TourSchedule after the deadline is not permitted —
    // symmetric with resolveScheduleAssignment.planNewSchedule.
    if (
      isDepartureFinalized({
        startDateTime: normalizedStart,
        freeCancellationDeadlineHours: tour.freeCancellationDeadlineHours,
        now,
      })
    ) {
      return { ok: false, reason: "DEPARTURE_FINALIZED" };
    }
  }

  // PRIVATE self-exclusion: assessBookingAcceptance does not police the PRIVATE
  // exclusivity invariant — the booking-create flow handles it inside
  // resolveScheduleAssignment, and reassignment needs a parallel path that
  // ignores the booking's own existing occupancy.
  if (tour.tourType === "PRIVATE") {
    if (input.target.kind === "EXISTING") {
      const conflict = await prisma.booking.findFirst({
        where: {
          tourScheduleId: input.target.scheduleId,
          status: { in: [...OCCUPYING_BOOKING_STATUSES] },
          id: { not: booking.id },
        },
        select: { id: true },
      });
      if (conflict) {
        throw new PrivateScheduleAlreadyBookedError(input.target.scheduleId);
      }
    } else {
      const sameTimeSchedules = await prisma.tourSchedule.findMany({
        where: {
          tourId: tour.id,
          startDateTime: normalizedStart,
          status: { in: [...ACTIVE_SCHEDULE_STATUSES] },
        },
        select: { id: true },
      });
      if (sameTimeSchedules.length > 0) {
        const conflict = await prisma.booking.findFirst({
          where: {
            tourScheduleId: { in: sameTimeSchedules.map((s) => s.id) },
            status: { in: [...OCCUPYING_BOOKING_STATUSES] },
            id: { not: booking.id },
          },
          select: { id: true, tourScheduleId: true },
        });
        if (conflict) {
          throw new PrivateScheduleAlreadyBookedError(conflict.tourScheduleId);
        }
      }
    }
  }

  let assessment = await assessBookingAcceptance({
    tourId: tour.id,
    scheduleId: existingTargetId,
    startDateTime: normalizedStart,
    requestedGuests: headcount,
    isNewDeparture,
    now,
  });

  // Same-JST-day move: the daily aggregate already includes this booking's
  // headcount (it still lives on the old schedule until the tx commits), so
  // the pipeline double-counts. Net daily load does not change, so override.
  if (
    !assessment.ok &&
    assessment.reason === "DAILY_CAPACITY_EXCEEDED" &&
    isSameJstDay(oldStart, normalizedStart)
  ) {
    assessment = { ok: true };
  }

  if (!assessment.ok) {
    return { ok: false, reason: assessment.reason };
  }

  const result = await prisma.$transaction(async (tx) => {
    const oldSchedule = await tx.tourSchedule.findUniqueOrThrow({
      where: { id: oldScheduleId },
      select: { capacity: true, status: true },
    });
    await tx.tourSchedule.update({
      where: { id: oldScheduleId },
      data: {
        capacity: oldSchedule.capacity + headcount,
        // Only the auto-FULL flip is reversed here; manual CANCELLED stays put
        // (business-rules.md §7.2 — operator intent must not be overwritten).
        ...(oldSchedule.status === "FULL" ? { status: "OPEN" } : {}),
      },
    });

    let newScheduleId: string;
    if (input.target.kind === "EXISTING") {
      const target = await tx.tourSchedule.findUniqueOrThrow({
        where: { id: input.target.scheduleId },
        select: { capacity: true },
      });
      const remaining = target.capacity - headcount;
      await tx.tourSchedule.update({
        where: { id: input.target.scheduleId },
        data: {
          capacity: remaining,
          status: remaining <= 0 ? "FULL" : "OPEN",
        },
      });
      newScheduleId = input.target.scheduleId;
    } else {
      const applicableRule = matchCapacityRuleForStart({
        startDateTime: normalizedStart,
        rules: tour.capacityRules,
      });
      const initialCapacity = resolveInitialCapacity(applicableRule, tour);
      const remaining = initialCapacity - headcount;
      const created = await tx.tourSchedule.create({
        data: {
          tourId: tour.id,
          startDateTime: normalizedStart,
          endDateTime,
          capacity: remaining,
          status: remaining <= 0 ? "FULL" : "OPEN",
          sourceRuleId: applicableRule?.id ?? null,
        },
      });
      newScheduleId = created.id;
    }

    const updatedBooking = await tx.booking.update({
      where: { id: booking.id },
      data: { tourScheduleId: newScheduleId },
    });
    const newSchedule = await tx.tourSchedule.findUniqueOrThrow({
      where: { id: newScheduleId },
    });
    return { booking: updatedBooking, newSchedule };
  });

  return {
    ok: true,
    booking: result.booking,
    oldScheduleId,
    newSchedule: result.newSchedule,
  };
}

function isSameJstDay(a: Date, b: Date): boolean {
  const ja = toJstComponents(a);
  const jb = toJstComponents(b);
  return ja.year === jb.year && ja.month === jb.month && ja.day === jb.day;
}
