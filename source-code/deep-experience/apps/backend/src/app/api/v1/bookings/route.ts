import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest, requireAuth, verifyToken } from "@/lib/auth";
import { jsonOk, validationError, jsonError } from "@/lib/response";
import { pickLocalized, resolveLocale } from "@/lib/locale";
import {
  PrivateScheduleAlreadyBookedError,
  TourNotAvailableError,
  resolveScheduleAssignment,
} from "@/lib/booking";
import type { BookingRejectionReason } from "@/lib/capacity/types";

// GET /api/v1/bookings — returns the authenticated guest's own bookings.
// The previous email-based search was removed: email is not a valid auth
// boundary (anyone could enumerate someone else's reservations by guessing
// or knowing their address). Booking lookup now requires a Guest JWT.
export async function GET(req: NextRequest) {
  const auth = requireAuth(req, "guest");
  if (auth instanceof Response) return auth;

  const locale = resolveLocale(req);

  const bookings = await prisma.booking.findMany({
    where: { guestId: auth.id },
    include: {
      tourSchedule: { include: { tour: true } },
      assignments: {
        where: { status: "ACCEPTED" },
        include: { guide: true },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return jsonOk({
    bookings: bookings.map((b) => {
      const tour = b.tourSchedule.tour;
      const imageUrls = JSON.parse(tour.imageUrls) as string[];
      return {
        id: b.id,
        status: b.status,
        assignmentState: b.assignmentState,
        numberOfGuests: b.numberOfGuests,
        tour: {
          id: tour.id,
          title: pickLocalized(locale, tour.title, tour.titleEn),
          imageUrl: imageUrls[0] || null,
        },
        schedule: {
          startDateTime: b.tourSchedule.startDateTime.toISOString(),
          meetingPointName: tour.meetingPointName,
        },
      };
    }),
  });
}

// POST /api/v1/bookings
//
// Issue #5: The client no longer picks a specific TourSchedule — it posts the
// desired (tourId, requestedStartDateTime, numberOfGuests) and the server
// auto-assigns a tentative slot via `resolveScheduleAssignment`.
export async function POST(req: NextRequest) {
  const body = await req.json();

  const errors: { field: string; message: string }[] = [];
  if (!body.tourId) errors.push({ field: "tourId", message: "required" });
  if (!body.requestedStartDateTime)
    errors.push({ field: "requestedStartDateTime", message: "required" });
  if (!body.travelerName)
    errors.push({ field: "travelerName", message: "required" });
  if (!body.travelerEmail)
    errors.push({ field: "travelerEmail", message: "required" });
  if (!body.numberOfGuests || body.numberOfGuests < 1)
    errors.push({ field: "numberOfGuests", message: "must be at least 1" });
  if (errors.length > 0) return validationError(errors);

  const parsedStart = parseRequestedStartDateTime(body.requestedStartDateTime);
  if (!parsedStart.ok) {
    return validationError([
      { field: "requestedStartDateTime", message: parsedStart.message },
    ]);
  }

  let guestId: string | null = null;
  const token = getTokenFromRequest(req);
  if (token) {
    const payload = verifyToken(token);
    if (payload && payload.role === "guest") {
      guestId = payload.id;
    }
  }

  let resolved;
  try {
    resolved = await resolveScheduleAssignment({
      tourId: body.tourId,
      requestedStartDateTime: parsedStart.date,
      requestedGuests: body.numberOfGuests,
    });
  } catch (err) {
    if (err instanceof TourNotAvailableError) {
      return jsonError("NOT_FOUND", "Tour not found", 404);
    }
    if (err instanceof PrivateScheduleAlreadyBookedError) {
      return jsonError(
        err.code,
        "This private tour schedule is already booked",
        409
      );
    }
    throw err;
  }

  if (!resolved.ok) {
    return jsonError(resolved.reason, rejectionMessage(resolved.reason), 409);
  }

  const plan = resolved.plan;
  const numberOfGuests = body.numberOfGuests;

  const result = await prisma.$transaction(async (tx) => {
    let scheduleId: string;
    if (plan.mode === "EXISTING") {
      const remaining = plan.currentCapacity - numberOfGuests;
      await tx.tourSchedule.update({
        where: { id: plan.scheduleId },
        data: {
          capacity: remaining,
          status: remaining <= 0 ? "FULL" : "OPEN",
        },
      });
      scheduleId = plan.scheduleId;
    } else {
      const remaining = plan.initialCapacity - numberOfGuests;
      const created = await tx.tourSchedule.create({
        data: {
          tourId: body.tourId,
          startDateTime: plan.normalizedStartDateTime,
          endDateTime: plan.endDateTime,
          capacity: remaining,
          status: remaining <= 0 ? "FULL" : "OPEN",
          sourceRuleId: plan.sourceRuleId,
        },
      });
      scheduleId = created.id;
    }

    const booking = await tx.booking.create({
      data: {
        tourScheduleId: scheduleId,
        travelerName: body.travelerName,
        travelerEmail: body.travelerEmail,
        travelerPhone: body.travelerPhone || null,
        numberOfGuests,
        specialRequests: body.specialRequests || null,
        assignmentState: "TENTATIVE",
        ...(guestId ? { guestId } : {}),
      },
    });

    const schedule = await tx.tourSchedule.findUniqueOrThrow({
      where: { id: scheduleId },
      include: { tour: true },
    });

    return { booking, schedule };
  });

  const { booking, schedule } = result;
  return jsonOk(
    {
      id: booking.id,
      tourScheduleId: booking.tourScheduleId,
      scheduleId: booking.tourScheduleId,
      assignmentState: booking.assignmentState,
      assignmentMode: plan.mode,
      status: booking.status,
      numberOfGuests: booking.numberOfGuests,
      totalPriceCents:
        schedule.tour.pricePerPersonCents * booking.numberOfGuests,
      currency: "USD",
      createdAt: booking.createdAt.toISOString(),
      tour: {
        title: schedule.tour.titleEn,
        startDateTime: schedule.startDateTime.toISOString(),
        meetingPointName: schedule.tour.meetingPointName,
      },
    },
    201
  );
}

type ParsedStart =
  | { ok: true; date: Date }
  | { ok: false; message: string };

function parseRequestedStartDateTime(input: unknown): ParsedStart {
  if (typeof input !== "string") {
    return { ok: false, message: "must be a string" };
  }
  if (!/(Z|[+-]\d{2}:\d{2})$/.test(input)) {
    return {
      ok: false,
      message: "must include timezone (Z or ±HH:MM)",
    };
  }
  const dt = new Date(input);
  if (Number.isNaN(dt.getTime())) {
    return { ok: false, message: "invalid ISO 8601 datetime" };
  }
  return { ok: true, date: dt };
}

const MESSAGES: Record<BookingRejectionReason, string> = {
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

function rejectionMessage(reason: BookingRejectionReason): string {
  return MESSAGES[reason] ?? "Booking rejected.";
}
