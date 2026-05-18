import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonOk, notFound } from "@/lib/response";
import { isBookingCutoffExceeded } from "@/lib/capacity";

// GET /api/v1/tours/:tourId/schedules
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tourId: string }> }
) {
  const { tourId } = await params;
  const { searchParams } = new URL(req.url);

  const tour = await prisma.tour.findUnique({ where: { id: tourId } });
  if (!tour || !tour.isActive) return notFound("Tour not found");

  const now = new Date();
  const dateFrom = searchParams.get("dateFrom")
    ? new Date(searchParams.get("dateFrom")!)
    : now;
  const dateTo = searchParams.get("dateTo")
    ? new Date(searchParams.get("dateTo")!)
    : new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const status = searchParams.get("status");

  const schedules = await prisma.tourSchedule.findMany({
    where: {
      tourId,
      startDateTime: { gte: dateFrom, lte: dateTo },
      ...(status ? { status } : { status: { in: ["OPEN", "FULL"] } }),
    },
    orderBy: { startDateTime: "asc" },
  });

  return jsonOk({
    schedules: schedules.map((s) => ({
      id: s.id,
      startDateTime: s.startDateTime.toISOString(),
      endDateTime: s.endDateTime.toISOString(),
      capacity: s.capacity,
      maxParticipants: tour.maxParticipants,
      remainingSlots: s.capacity,
      status: s.status,
      isCutoffClosed: isBookingCutoffExceeded({
        startDateTime: s.startDateTime,
        bookingCutoffMinutes: tour.bookingCutoffMinutes,
        now,
      }),
    })),
  });
}
