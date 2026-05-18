import type { CapacityRule, Tour } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  assessBookingAcceptance,
  matchCapacityRuleForStart,
} from "@/lib/capacity";
import {
  ACTIVE_SCHEDULE_STATUSES,
  OCCUPYING_BOOKING_STATUSES,
} from "@/lib/capacity/constants";
import type { BookingRejectionReason } from "@/lib/capacity/types";
import { PrivateScheduleAlreadyBookedError } from "./errors";
import { isDepartureFinalized } from "./isDepartureFinalized";

// Auto-assignment orchestrator for Issue #5.
//
// Decides whether a booking at (tourId, requestedStartDateTime) should attach
// to an existing TourSchedule or spawn a new one, respecting the booking-
// acceptance rules from Issue #2. Does not perform DB writes — the caller is
// responsible for executing the returned `Plan` inside its own transaction so
// the schedule mutation and booking insert stay atomic.
//
// NOTE: concurrent-booking race mitigation (SERIALIZABLE / SELECT FOR UPDATE /
// advisory lock) is deferred to the Phase 1 Postgres migration issue. Under
// SQLite dev the single-writer property makes the multi-query read path safe.

export type AssignmentPlan =
  | {
      mode: "EXISTING";
      scheduleId: string;
      currentCapacity: number;
      tourType: string;
    }
  | {
      mode: "NEW";
      normalizedStartDateTime: Date;
      endDateTime: Date;
      initialCapacity: number;
      sourceRuleId: string | null;
      tourType: string;
    };

export type ResolveResult =
  | { ok: true; plan: AssignmentPlan }
  | { ok: false; reason: BookingRejectionReason };

export type ResolveInput = {
  tourId: string;
  requestedStartDateTime: Date;
  requestedGuests: number;
  now?: Date;
};

const DEFAULT_CAPACITY = 6; // Notion spec "初期設定 6名"

export function normalizeToMinutePrecision(dt: Date): Date {
  const d = new Date(dt);
  d.setUTCSeconds(0, 0);
  return d;
}

export async function resolveScheduleAssignment(
  input: ResolveInput
): Promise<ResolveResult> {
  if (!Number.isInteger(input.requestedGuests) || input.requestedGuests < 1) {
    throw new Error("requestedGuests must be a positive integer");
  }

  const tour = await prisma.tour.findUnique({
    where: { id: input.tourId },
    include: {
      capacityRules: { where: { isActive: true }, orderBy: { priority: "desc" } },
    },
  });
  if (!tour || !tour.isActive) {
    throw new TourNotAvailableError(input.tourId);
  }

  const normalized = normalizeToMinutePrecision(input.requestedStartDateTime);

  const matched = await prisma.tourSchedule.findMany({
    where: {
      tourId: tour.id,
      startDateTime: normalized,
      status: { in: [...ACTIVE_SCHEDULE_STATUSES] },
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      capacity: true,
      status: true,
      sourceRuleId: true,
    },
  });

  if (tour.tourType === "PRIVATE") {
    return resolvePrivate({
      tour,
      matched,
      normalized,
      requestedGuests: input.requestedGuests,
      now: input.now ?? new Date(),
    });
  }

  return resolveGroup({
    tour,
    matched,
    normalized,
    requestedGuests: input.requestedGuests,
    now: input.now ?? new Date(),
  });
}

type ResolveCore = {
  tour: Tour & { capacityRules: CapacityRule[] };
  matched: Array<{
    id: string;
    capacity: number;
    status: string;
    sourceRuleId: string | null;
  }>;
  normalized: Date;
  requestedGuests: number;
  now: Date;
};

async function resolveGroup(core: ResolveCore): Promise<ResolveResult> {
  // Try every existing same-time schedule in creation order; pick the first
  // one that clears the full acceptance pipeline.
  for (const candidate of core.matched) {
    const assessment = await assessBookingAcceptance({
      tourId: core.tour.id,
      scheduleId: candidate.id,
      startDateTime: core.normalized,
      requestedGuests: core.requestedGuests,
      isNewDeparture: false,
      now: core.now,
    });
    if (assessment.ok) {
      return {
        ok: true,
        plan: {
          mode: "EXISTING",
          scheduleId: candidate.id,
          currentCapacity: candidate.capacity,
          tourType: core.tour.tourType,
        },
      };
    }
  }

  // No existing candidate fits — check if spawning a new schedule is allowed
  // and, if so, decide its initial capacity.
  const newAssessment = await assessBookingAcceptance({
    tourId: core.tour.id,
    startDateTime: core.normalized,
    requestedGuests: core.requestedGuests,
    isNewDeparture: true,
    now: core.now,
  });
  if (!newAssessment.ok) {
    return { ok: false, reason: newAssessment.reason };
  }

  return planNewSchedule(core);
}

async function resolvePrivate(core: ResolveCore): Promise<ResolveResult> {
  // PRIVATE invariant: at most one occupying booking for any (tourId, startDateTime).
  // If any same-time schedule is already occupied, reject via Issue #3's error class
  // (caller maps it to 409 PRIVATE_SCHEDULE_ALREADY_BOOKED).
  if (core.matched.length > 0) {
    const occupied = await prisma.booking.findFirst({
      where: {
        tourScheduleId: { in: core.matched.map((m) => m.id) },
        status: { in: [...OCCUPYING_BOOKING_STATUSES] },
      },
      select: { id: true, tourScheduleId: true },
    });
    if (occupied) {
      throw new PrivateScheduleAlreadyBookedError(occupied.tourScheduleId);
    }
    // Matched but empty: reuse the first schedule.
    const candidate = core.matched[0];
    const assessment = await assessBookingAcceptance({
      tourId: core.tour.id,
      scheduleId: candidate.id,
      startDateTime: core.normalized,
      requestedGuests: core.requestedGuests,
      isNewDeparture: false,
      now: core.now,
    });
    if (assessment.ok) {
      return {
        ok: true,
        plan: {
          mode: "EXISTING",
          scheduleId: candidate.id,
          currentCapacity: candidate.capacity,
          tourType: core.tour.tourType,
        },
      };
    }
    return { ok: false, reason: assessment.reason };
  }

  const newAssessment = await assessBookingAcceptance({
    tourId: core.tour.id,
    startDateTime: core.normalized,
    requestedGuests: core.requestedGuests,
    isNewDeparture: true,
    now: core.now,
  });
  if (!newAssessment.ok) {
    return { ok: false, reason: newAssessment.reason };
  }
  return planNewSchedule(core);
}

function planNewSchedule(core: ResolveCore): ResolveResult {
  // Free-cancellation deadline gate: once the deadline passes, existing
  // schedules may still accept bookings (handled via the EXISTING branch)
  // but spawning a new TourSchedule is forbidden per business-rules.md §7.x.
  if (
    isDepartureFinalized({
      startDateTime: core.normalized,
      freeCancellationDeadlineHours: core.tour.freeCancellationDeadlineHours,
      now: core.now,
    })
  ) {
    return { ok: false, reason: "DEPARTURE_FINALIZED" };
  }

  const applicableRule = matchCapacityRuleForStart({
    startDateTime: core.normalized,
    rules: core.tour.capacityRules,
  });

  const initialCapacity = resolveInitialCapacity(applicableRule, core.tour);
  if (core.requestedGuests > initialCapacity) {
    return { ok: false, reason: "MAX_PARTICIPANTS_EXCEEDED" };
  }

  const endDateTime = new Date(
    core.normalized.getTime() + core.tour.durationMinutes * 60 * 1000
  );

  if (!applicableRule) {
    // Visibility aid for operators: without a rule the initial capacity falls
    // back to Tour.maxParticipants (or the hard-coded default), which may
    // bypass operator-intent pricing ceilings.
    console.warn(
      `[resolveScheduleAssignment] Auto-created schedule without source rule (tour=${core.tour.id}, start=${core.normalized.toISOString()})`
    );
  }

  return {
    ok: true,
    plan: {
      mode: "NEW",
      normalizedStartDateTime: core.normalized,
      endDateTime,
      initialCapacity,
      sourceRuleId: applicableRule?.id ?? null,
      tourType: core.tour.tourType,
    },
  };
}

export function resolveInitialCapacity(
  applicableRule: CapacityRule | null,
  tour: Pick<Tour, "maxParticipants">
): number {
  if (applicableRule && applicableRule.capacity > 0) {
    return applicableRule.capacity;
  }
  if (tour.maxParticipants > 0) {
    return tour.maxParticipants;
  }
  return DEFAULT_CAPACITY;
}

export class TourNotAvailableError extends Error {
  readonly code = "TOUR_NOT_FOUND" as const;
  constructor(readonly tourId: string) {
    super(`Tour not found or inactive: ${tourId}`);
    this.name = "TourNotAvailableError";
  }
}
