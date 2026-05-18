import { prisma } from "@/lib/prisma";
import { isDepartureFinalized } from "@/lib/booking/isDepartureFinalized";
import type { JobResult } from "./runJob";

// FINALIZE batch service.
//
// Flips Booking.assignmentState TENTATIVE → FINALIZED for bookings whose
// departure has crossed the free-cancellation deadline. Bookings under a
// Tour with freeCancellationDeadlineHours === null are intentionally skipped
// (null = "no deadline configured") and surfaced as a WARN so operators can
// notice missing configuration.
//
// MVP: we fetch the candidate set in JS and compute deadline-expiration via
// the shared isDepartureFinalized helper so bulk math stays in sync across
// the batch and on-read guards. SQLite date arithmetic is intentionally
// avoided at this layer.

export type FinalizeBookingsPayload = {
  finalizedBookingIds: string[];
  warnBookingIds: string[]; // TENTATIVE bookings under null-deadline tours
};

export async function finalizeBookings(now: Date = new Date()): Promise<JobResult> {
  // Feature-flag escape hatch: when guard is disabled, emit an empty run so
  // JobExecutionLog still records a heartbeat without mutating state.
  const guardDisabled = process.env.FINALIZE_GUARD_ENABLED === "false";
  if (guardDisabled) {
    return {
      processedCount: 0,
      warnCount: 0,
      payload: {
        finalizedBookingIds: [],
        warnBookingIds: [],
        note: "FINALIZE_GUARD_ENABLED=false",
      } satisfies FinalizeBookingsPayload & { note: string },
    };
  }

  const candidates = await prisma.booking.findMany({
    where: {
      assignmentState: "TENTATIVE",
      status: { notIn: ["CANCELLED", "EXPIRED"] },
    },
    select: {
      id: true,
      tourSchedule: {
        select: {
          startDateTime: true,
          tour: { select: { freeCancellationDeadlineHours: true } },
        },
      },
    },
  });

  const finalizedBookingIds: string[] = [];
  const warnBookingIds: string[] = [];

  for (const b of candidates) {
    const hours = b.tourSchedule.tour.freeCancellationDeadlineHours;
    if (hours === null) {
      warnBookingIds.push(b.id);
      continue;
    }
    if (
      isDepartureFinalized({
        startDateTime: b.tourSchedule.startDateTime,
        freeCancellationDeadlineHours: hours,
        now,
      })
    ) {
      finalizedBookingIds.push(b.id);
    }
  }

  if (finalizedBookingIds.length > 0) {
    await prisma.booking.updateMany({
      where: { id: { in: finalizedBookingIds } },
      data: { assignmentState: "FINALIZED" },
    });
  }

  if (warnBookingIds.length > 0) {
    console.warn(
      `[finalizeBookings] ${warnBookingIds.length} TENTATIVE booking(s) sit under a Tour with freeCancellationDeadlineHours=null`
    );
  }

  return {
    processedCount: finalizedBookingIds.length,
    warnCount: warnBookingIds.length,
    payload: { finalizedBookingIds, warnBookingIds } satisfies FinalizeBookingsPayload,
  };
}
