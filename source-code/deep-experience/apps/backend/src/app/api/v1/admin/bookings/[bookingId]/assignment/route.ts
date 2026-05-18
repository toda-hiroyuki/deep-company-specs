import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import {
  jsonError,
  jsonOk,
  notFound,
  validationError,
} from "@/lib/response";
import {
  PrivateScheduleAlreadyBookedError,
  reassignBookingSchedule,
  type ReassignReason,
  type ReassignTarget,
} from "@/lib/booking";
import type { BookingRejectionReason } from "@/lib/capacity/types";

// PATCH /api/v1/admin/bookings/:bookingId/assignment
//
// Body: either { scheduleId: string } or { newSchedule: { startDateTime: string; endDateTime?: string } }.
// Mutually exclusive — supplying both is a 422.
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

  const parsed = parseTarget(body);
  if (!parsed.ok) return validationError(parsed.errors);

  try {
    const result = await reassignBookingSchedule({
      bookingId,
      target: parsed.target,
    });
    if (!result.ok) {
      return mapReasonToResponse(result.reason);
    }
    return jsonOk({
      booking: {
        id: result.booking.id,
        tourScheduleId: result.booking.tourScheduleId,
        status: result.booking.status,
        assignmentState: result.booking.assignmentState,
        numberOfGuests: result.booking.numberOfGuests,
      },
      schedule: {
        id: result.newSchedule.id,
        tourId: result.newSchedule.tourId,
        startDateTime: result.newSchedule.startDateTime.toISOString(),
        endDateTime: result.newSchedule.endDateTime.toISOString(),
        capacity: result.newSchedule.capacity,
        status: result.newSchedule.status,
        sourceRuleId: result.newSchedule.sourceRuleId,
      },
      oldScheduleId: result.oldScheduleId,
    });
  } catch (err) {
    if (err instanceof PrivateScheduleAlreadyBookedError) {
      return jsonError(
        err.code,
        "This private tour schedule is already booked",
        409
      );
    }
    throw err;
  }
}

type ParseSuccess = { ok: true; target: ReassignTarget };
type ParseFailure = {
  ok: false;
  errors: { field: string; message: string }[];
};

function parseTarget(body: unknown): ParseSuccess | ParseFailure {
  if (!body || typeof body !== "object") {
    return {
      ok: false,
      errors: [{ field: "body", message: "must be a JSON object" }],
    };
  }
  const b = body as Record<string, unknown>;
  const hasScheduleId =
    typeof b.scheduleId === "string" && b.scheduleId.length > 0;
  const hasNewSchedule =
    b.newSchedule !== null &&
    typeof b.newSchedule === "object" &&
    b.newSchedule !== undefined;

  if (hasScheduleId && hasNewSchedule) {
    return {
      ok: false,
      errors: [
        {
          field: "body",
          message: "scheduleId and newSchedule are mutually exclusive",
        },
      ],
    };
  }
  if (!hasScheduleId && !hasNewSchedule) {
    return {
      ok: false,
      errors: [
        {
          field: "body",
          message: "either scheduleId or newSchedule is required",
        },
      ],
    };
  }

  if (hasScheduleId) {
    return {
      ok: true,
      target: { kind: "EXISTING", scheduleId: b.scheduleId as string },
    };
  }

  const ns = b.newSchedule as Record<string, unknown>;
  if (typeof ns.startDateTime !== "string") {
    return {
      ok: false,
      errors: [
        { field: "newSchedule.startDateTime", message: "must be a string" },
      ],
    };
  }
  const startParsed = parseTzIso(ns.startDateTime);
  if (!startParsed.ok) {
    return {
      ok: false,
      errors: [
        {
          field: "newSchedule.startDateTime",
          message: startParsed.message,
        },
      ],
    };
  }
  let endDateTime: Date | undefined;
  if (ns.endDateTime !== undefined && ns.endDateTime !== null) {
    if (typeof ns.endDateTime !== "string") {
      return {
        ok: false,
        errors: [
          { field: "newSchedule.endDateTime", message: "must be a string" },
        ],
      };
    }
    const endParsed = parseTzIso(ns.endDateTime);
    if (!endParsed.ok) {
      return {
        ok: false,
        errors: [
          { field: "newSchedule.endDateTime", message: endParsed.message },
        ],
      };
    }
    endDateTime = endParsed.date;
  }
  return {
    ok: true,
    target: {
      kind: "NEW",
      startDateTime: startParsed.date,
      ...(endDateTime ? { endDateTime } : {}),
    },
  };
}

type ParsedIso = { ok: true; date: Date } | { ok: false; message: string };

function parseTzIso(input: string): ParsedIso {
  if (!/(Z|[+-]\d{2}:\d{2})$/.test(input)) {
    return { ok: false, message: "must include timezone (Z or ±HH:MM)" };
  }
  const dt = new Date(input);
  if (Number.isNaN(dt.getTime())) {
    return { ok: false, message: "invalid ISO 8601 datetime" };
  }
  return { ok: true, date: dt };
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

function mapReasonToResponse(reason: ReassignReason) {
  switch (reason) {
    case "BOOKING_NOT_FOUND":
      return notFound("Booking not found");
    case "SCHEDULE_NOT_FOUND":
      return notFound("Target schedule not found");
    case "TOUR_MISMATCH":
      return jsonError(
        "TOUR_MISMATCH",
        "Target schedule belongs to a different tour",
        409
      );
    case "TARGET_SAME_AS_CURRENT":
      return jsonError(
        "TARGET_SAME_AS_CURRENT",
        "Target schedule is the booking's current schedule",
        409
      );
    case "TARGET_SCHEDULE_INACTIVE":
      return jsonError(
        "TARGET_SCHEDULE_INACTIVE",
        "Target schedule is not active",
        409
      );
    case "BOOKING_FINALIZED":
      return jsonError(
        "BOOKING_FINALIZED",
        "FINALIZED bookings cannot be reassigned",
        409
      );
    case "BOOKING_NOT_ACTIVE":
      return jsonError(
        "BOOKING_NOT_ACTIVE",
        "Cancelled / completed / in-progress bookings cannot be reassigned",
        409
      );
    default:
      return jsonError(reason, REJECTION_MESSAGES[reason] ?? "Reassign rejected", 409);
  }
}
