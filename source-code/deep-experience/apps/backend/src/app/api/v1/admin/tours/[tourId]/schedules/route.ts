import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonOk, notFound, validationError } from "@/lib/response";
import {
  parseJstDateRange,
  JstDateRangeError,
} from "@/lib/datetime/jstRange";
import {
  scheduleSummaryInclude,
  summarizeSchedule,
} from "@/lib/booking/scheduleSummary";

const ALLOWED_STATUSES = ["OPEN", "FULL", "CANCELLED", "COMPLETED"] as const;
type ScheduleStatus = (typeof ALLOWED_STATUSES)[number];

function isScheduleStatus(v: string): v is ScheduleStatus {
  return (ALLOWED_STATUSES as readonly string[]).includes(v);
}

// GET /api/v1/admin/tours/:tourId/schedules
// Query: from, to ("YYYY-MM-DD" in JST), status, zeroBookings=true
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tourId: string }> }
) {
  const auth = requireAuth(req, "admin");
  if (auth instanceof Response) return auth;

  const { tourId } = await params;
  const tour = await prisma.tour.findUnique({ where: { id: tourId } });
  if (!tour) return notFound("Tour not found");

  const url = new URL(req.url);
  const fromParam = url.searchParams.get("from") ?? undefined;
  const toParam = url.searchParams.get("to") ?? undefined;
  const statusParam = url.searchParams.get("status") ?? undefined;
  const zeroBookings = url.searchParams.get("zeroBookings") === "true";

  let fromUtc: Date | undefined;
  let toUtc: Date | undefined;
  try {
    ({ fromUtc, toUtc } = parseJstDateRange(fromParam, toParam));
  } catch (err) {
    if (err instanceof JstDateRangeError) {
      return validationError([{ field: err.field, message: err.message }]);
    }
    throw err;
  }

  if (statusParam && !isScheduleStatus(statusParam)) {
    return validationError([
      {
        field: "status",
        message: `must be one of ${ALLOWED_STATUSES.join(", ")}`,
      },
    ]);
  }

  const startDateTimeFilter =
    fromUtc || toUtc
      ? {
          ...(fromUtc ? { gte: fromUtc } : {}),
          ...(toUtc ? { lte: toUtc } : {}),
        }
      : undefined;

  const rows = await prisma.tourSchedule.findMany({
    where: {
      tourId,
      ...(statusParam ? { status: statusParam } : {}),
      ...(startDateTimeFilter ? { startDateTime: startDateTimeFilter } : {}),
    },
    orderBy: { startDateTime: "asc" },
    include: scheduleSummaryInclude,
  });

  let schedules = rows.map(summarizeSchedule);
  if (zeroBookings) {
    schedules = schedules.filter((s) => s.bookingCount === 0);
  }

  return jsonOk({
    schedules,
    tour: {
      bookingCutoffMinutes: tour.bookingCutoffMinutes,
      freeCancellationDeadlineHours: tour.freeCancellationDeadlineHours,
    },
  });
}

// POST /api/v1/admin/tours/:tourId/schedules
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tourId: string }> }
) {
  const auth = requireAuth(req, "admin");
  if (auth instanceof Response) return auth;

  const { tourId } = await params;
  const body = await req.json();

  const tour = await prisma.tour.findUnique({ where: { id: tourId } });
  if (!tour) return notFound("Tour not found");

  const errors: { field: string; message: string }[] = [];
  if (!body.startDateTime)
    errors.push({ field: "startDateTime", message: "required" });
  if (errors.length > 0) return validationError(errors);

  const startDateTime = new Date(body.startDateTime);
  const endDateTime = body.endDateTime
    ? new Date(body.endDateTime)
    : new Date(startDateTime.getTime() + tour.durationMinutes * 60 * 1000);

  const schedule = await prisma.tourSchedule.create({
    data: {
      tourId,
      startDateTime,
      endDateTime,
      capacity: body.capacity ?? tour.maxParticipants,
    },
  });

  return jsonOk(schedule, 201);
}
