import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonOk, validationError } from "@/lib/response";

// All aggregations bucket by Asia/Tokyo calendar day. Keep this constant on
// the server so the dashboard graph aligns with how operators think about
// "today" / "this week" regardless of caller TZ.
const TZ_OFFSET_MIN = 9 * 60; // JST = UTC+9, no DST

type Period = "today" | "7d" | "30d" | "custom";

interface ResolvedRange {
  start: Date; // inclusive (UTC moment)
  end: Date; // exclusive
  bucketDays: string[]; // YYYY-MM-DD strings in JST, ordered
}

// Take a UTC Date, shift into JST wall-clock, then floor/ceil to JST midnight.
function jstStartOfDay(d: Date): Date {
  const shifted = new Date(d.getTime() + TZ_OFFSET_MIN * 60_000);
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() - TZ_OFFSET_MIN * 60_000);
}

function jstDayKey(d: Date): string {
  const shifted = new Date(d.getTime() + TZ_OFFSET_MIN * 60_000);
  return shifted.toISOString().slice(0, 10);
}

function resolveRange(
  period: Period,
  fromStr: string | null,
  toStr: string | null
): ResolvedRange | { error: string } {
  const now = new Date();
  let start: Date;
  let end: Date;

  if (period === "today") {
    start = jstStartOfDay(now);
    end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  } else if (period === "7d") {
    end = new Date(jstStartOfDay(now).getTime() + 24 * 60 * 60 * 1000);
    start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else if (period === "30d") {
    end = new Date(jstStartOfDay(now).getTime() + 24 * 60 * 60 * 1000);
    start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
  } else {
    if (!fromStr || !toStr) return { error: "from and to required for custom period" };
    const fromD = new Date(`${fromStr}T00:00:00+09:00`);
    const toD = new Date(`${toStr}T00:00:00+09:00`);
    if (Number.isNaN(fromD.getTime()) || Number.isNaN(toD.getTime())) {
      return { error: "invalid date format (expected YYYY-MM-DD)" };
    }
    if (toD < fromD) return { error: "to must be on or after from" };
    start = fromD;
    end = new Date(toD.getTime() + 24 * 60 * 60 * 1000);
  }

  const bucketDays: string[] = [];
  for (let t = start.getTime(); t < end.getTime(); t += 24 * 60 * 60 * 1000) {
    bucketDays.push(jstDayKey(new Date(t)));
  }

  return { start, end, bucketDays };
}

// Bookings considered "active" when computing fill: anything that still
// occupies a seat. Cancelled/expired/no-show free up capacity.
const ACTIVE_BOOKING_STATUSES = ["PENDING", "CONFIRMED", "IN_PROGRESS", "COMPLETED"];

export async function GET(req: NextRequest) {
  const auth = requireAuth(req, "admin");
  if (auth instanceof Response) return auth;

  const { searchParams } = new URL(req.url);
  const period = (searchParams.get("period") as Period) || "7d";
  if (!["today", "7d", "30d", "custom"].includes(period)) {
    return validationError([{ field: "period", message: "invalid" }]);
  }

  const range = resolveRange(period, searchParams.get("from"), searchParams.get("to"));
  if ("error" in range) {
    return validationError([{ field: "range", message: range.error }]);
  }

  const { start, end, bucketDays } = range;

  // 1. Schedules in the period with their bookings.
  const schedules = await prisma.tourSchedule.findMany({
    where: {
      startDateTime: { gte: start, lt: end },
    },
    include: {
      tour: { select: { id: true, title: true, titleEn: true, maxParticipants: true } },
      bookings: {
        select: {
          id: true,
          status: true,
          numberOfGuests: true,
          createdAt: true,
          travelerName: true,
          tourScheduleId: true,
          assignments: { where: { status: "ACCEPTED" }, select: { id: true } },
        },
      },
    },
    orderBy: { startDateTime: "asc" },
  });

  // 2. Per-schedule fill rate
  type ScheduleRow = {
    id: string;
    tourId: string;
    tourTitle: string;
    startDateTime: string;
    status: string;
    totalSeats: number;
    bookedGuests: number;
    bookingCount: number;
    fillRate: number;
    hasAcceptedGuide: boolean;
  };
  const scheduleRows: ScheduleRow[] = schedules.map((s) => {
    const activeBookings = s.bookings.filter((b) =>
      ACTIVE_BOOKING_STATUSES.includes(b.status)
    );
    const bookedGuests = activeBookings.reduce(
      (sum, b) => sum + b.numberOfGuests,
      0
    );
    // capacity = remaining seats (decremented on booking).
    // total = remaining + booked
    const totalSeats = s.capacity + bookedGuests;
    const fillRate = totalSeats > 0 ? bookedGuests / totalSeats : 0;
    const hasAcceptedGuide = activeBookings.some(
      (b) => b.assignments.length > 0
    );
    return {
      id: s.id,
      tourId: s.tourId,
      tourTitle: s.tour.titleEn || s.tour.title,
      startDateTime: s.startDateTime.toISOString(),
      status: s.status,
      totalSeats,
      bookedGuests,
      bookingCount: activeBookings.length,
      fillRate,
      hasAcceptedGuide,
    };
  });

  // 3. KPIs
  const totalSchedules = scheduleRows.length;
  const totalBookings = scheduleRows.reduce(
    (sum, r) => sum + r.bookingCount,
    0
  );
  const totalGuests = scheduleRows.reduce(
    (sum, r) => sum + r.bookedGuests,
    0
  );
  const avgFillRate =
    scheduleRows.length > 0
      ? scheduleRows.reduce((sum, r) => sum + r.fillRate, 0) /
        scheduleRows.length
      : 0;
  const unassignedGuideBookings = scheduleRows.filter(
    (r) => r.bookingCount > 0 && !r.hasAcceptedGuide
  ).length;

  // 4. Daily booking trend
  // We bucket by booking.createdAt (when booking was made) within the schedules in range.
  // For "7d view" this means: bookings made on each of those days. Conventional dashboard meaning.
  const allBookingsInRange = await prisma.booking.findMany({
    where: { createdAt: { gte: start, lt: end } },
    select: {
      createdAt: true,
      numberOfGuests: true,
      status: true,
    },
  });

  const bookingsByDay = new Map<string, { bookings: number; guests: number }>();
  for (const day of bucketDays) {
    bookingsByDay.set(day, { bookings: 0, guests: 0 });
  }
  for (const b of allBookingsInRange) {
    if (!ACTIVE_BOOKING_STATUSES.includes(b.status)) continue;
    const key = jstDayKey(b.createdAt);
    const cell = bookingsByDay.get(key);
    if (cell) {
      cell.bookings += 1;
      cell.guests += b.numberOfGuests;
    }
  }
  const dailyTrend = bucketDays.map((day) => ({
    day,
    bookings: bookingsByDay.get(day)?.bookings ?? 0,
    guests: bookingsByDay.get(day)?.guests ?? 0,
  }));

  // 5. Tour-level rollup
  type TourRow = {
    tourId: string;
    title: string;
    scheduleCount: number;
    bookingCount: number;
    guestCount: number;
    totalSeats: number;
    avgFillRate: number;
  };
  const tourMap = new Map<string, TourRow>();
  for (const r of scheduleRows) {
    const existing = tourMap.get(r.tourId) ?? {
      tourId: r.tourId,
      title: r.tourTitle,
      scheduleCount: 0,
      bookingCount: 0,
      guestCount: 0,
      totalSeats: 0,
      avgFillRate: 0,
    };
    existing.scheduleCount += 1;
    existing.bookingCount += r.bookingCount;
    existing.guestCount += r.bookedGuests;
    existing.totalSeats += r.totalSeats;
    tourMap.set(r.tourId, existing);
  }
  const tourRollup: TourRow[] = Array.from(tourMap.values())
    .map((t) => ({
      ...t,
      avgFillRate: t.totalSeats > 0 ? t.guestCount / t.totalSeats : 0,
    }))
    .sort((a, b) => b.guestCount - a.guestCount);

  // 6. Status breakdown of bookings on schedules in range
  const statusBreakdown = new Map<string, number>();
  for (const s of schedules) {
    for (const b of s.bookings) {
      statusBreakdown.set(b.status, (statusBreakdown.get(b.status) ?? 0) + 1);
    }
  }
  const statusBreakdownArr = Array.from(statusBreakdown.entries()).map(
    ([status, count]) => ({ status, count })
  );

  // 7. Upcoming schedules (within range, sorted by start, top 15)
  const upcomingSchedules = scheduleRows.slice(0, 15);

  return jsonOk({
    period,
    range: {
      start: start.toISOString(),
      end: end.toISOString(),
    },
    kpi: {
      totalSchedules,
      totalBookings,
      totalGuests,
      avgFillRate,
      unassignedGuideBookings,
    },
    dailyTrend,
    tourRollup,
    statusBreakdown: statusBreakdownArr,
    upcomingSchedules,
  });
}
