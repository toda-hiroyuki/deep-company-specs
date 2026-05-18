import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  jsonError,
  jsonOk,
  notFound,
  validationError,
} from "@/lib/response";
import {
  resolveUnitPriceCents,
  updateBookingGuests,
  type UpdateBookingGuestsReason,
} from "@/lib/booking";
import type { BookingRejectionReason } from "@/lib/capacity/types";

// GET /api/v1/admin/bookings/:bookingId
//
// Detail-page view. Mirrors the list-API shape (see ../route.ts) and adds the
// fields the booking-detail page needs but the list does not surface:
// totalPriceCents / unitPriceCents / schedule.capacity / schedule.maxParticipants.
// unitPriceCents lets the guest-count edit modal preview the new total without
// re-deriving the rate on the client.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  const auth = requireAuth(req, "admin");
  if (auth instanceof Response) return auth;

  const { bookingId } = await params;
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      tourSchedule: { include: { tour: true } },
      assignments: { include: { guide: true } },
    },
  });
  if (!booking) return notFound("Booking not found");

  const tour = booking.tourSchedule.tour;
  const unitPriceCents = await resolveUnitPriceCents(
    booking.rateId,
    tour.id,
    tour.pricePerPersonCents
  );

  return jsonOk({
    booking: {
      id: booking.id,
      status: booking.status,
      assignmentState: booking.assignmentState,
      travelerName: booking.travelerName,
      travelerEmail: booking.travelerEmail,
      numberOfGuests: booking.numberOfGuests,
      totalPriceCents: booking.totalPriceCents,
      unitPriceCents,
      specialRequests: booking.specialRequests,
      createdAt: booking.createdAt.toISOString(),
      tour: {
        id: tour.id,
        title: tour.title,
        durationMinutes: tour.durationMinutes,
      },
      schedule: {
        id: booking.tourSchedule.id,
        startDateTime: booking.tourSchedule.startDateTime.toISOString(),
        endDateTime: booking.tourSchedule.endDateTime.toISOString(),
        meetingPointName: tour.meetingPointName,
        capacity: booking.tourSchedule.capacity,
        maxParticipants: tour.maxParticipants,
      },
      assignments: booking.assignments.map((a) => ({
        id: a.id,
        status: a.status,
        guideName: a.guide.name,
        guideId: a.guide.id,
        declineReason: a.declineReason,
      })),
    },
  });
}

// PATCH /api/v1/admin/bookings/:bookingId
//
// Body: { numberOfGuests: number }. The handler rejects unknown keys so that
// future field additions (special requests, contact updates, ...) are an
// explicit schema change rather than a silent merge.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  const auth = requireAuth(req, "admin");
  if (auth instanceof Response) return auth;

  const { bookingId } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return validationError([{ field: "body", message: "invalid JSON" }]);
  }

  const parsed = parseBody(body);
  if (!parsed.ok) return validationError(parsed.errors);

  const result = await updateBookingGuests({
    bookingId,
    newNumberOfGuests: parsed.numberOfGuests,
  });
  if (!result.ok) return mapReasonToResponse(result.reason);

  return jsonOk({
    booking: {
      id: result.booking.id,
      numberOfGuests: result.booking.numberOfGuests,
      totalPriceCents: result.booking.totalPriceCents,
      assignmentState: result.booking.assignmentState,
      status: result.booking.status,
    },
    schedule: {
      id: result.schedule.id,
      capacity: result.schedule.capacity,
      status: result.schedule.status,
    },
  });
}

type ParseSuccess = { ok: true; numberOfGuests: number };
type ParseFailure = {
  ok: false;
  errors: { field: string; message: string }[];
};

function parseBody(body: unknown): ParseSuccess | ParseFailure {
  if (!body || typeof body !== "object") {
    return {
      ok: false,
      errors: [{ field: "body", message: "must be a JSON object" }],
    };
  }
  const b = body as Record<string, unknown>;
  const allowed = new Set(["numberOfGuests"]);
  const unknownFields = Object.keys(b).filter((k) => !allowed.has(k));
  if (unknownFields.length > 0) {
    return {
      ok: false,
      errors: unknownFields.map((field) => ({
        field,
        message: "unknown field",
      })),
    };
  }
  if (
    typeof b.numberOfGuests !== "number" ||
    !Number.isInteger(b.numberOfGuests)
  ) {
    return {
      ok: false,
      errors: [
        { field: "numberOfGuests", message: "must be an integer" },
      ],
    };
  }
  if (b.numberOfGuests < 1) {
    return {
      ok: false,
      errors: [
        { field: "numberOfGuests", message: "must be at least 1" },
      ],
    };
  }
  return { ok: true, numberOfGuests: b.numberOfGuests };
}

const REJECTION_MESSAGES: Record<BookingRejectionReason, string> = {
  SCHEDULE_CLOSED_OUT: "This date/time is closed for bookings.",
  TIME_SLOT_FULL: "This time slot is full.",
  DAILY_CAPACITY_EXCEEDED: "The daily capacity for this tour is full.",
  MAX_DEPARTURES_EXCEEDED:
    "The maximum number of tours for this day has been reached.",
  MIN_PARTICIPANTS_NOT_MET: "Minimum participant count is not met.",
  MAX_PARTICIPANTS_EXCEEDED:
    "The requested guest count exceeds the allowed maximum.",
  BOOKING_CUTOFF_EXCEEDED:
    "Bookings for this departure are closed (cutoff time passed).",
  DEPARTURE_FINALIZED:
    "New departures cannot be created after the free-cancellation deadline.",
};

function mapReasonToResponse(reason: UpdateBookingGuestsReason) {
  switch (reason) {
    case "BOOKING_NOT_FOUND":
      return notFound("Booking not found");
    case "BOOKING_NOT_ACTIVE":
      return jsonError(
        "BOOKING_NOT_ACTIVE",
        "Booking cannot be modified in its current state",
        409
      );
    case "GUESTS_UNCHANGED":
      return jsonError(
        "GUESTS_UNCHANGED",
        "numberOfGuests is unchanged",
        409
      );
    default:
      return jsonError(
        reason,
        REJECTION_MESSAGES[reason] ?? "Update rejected",
        409
      );
  }
}
