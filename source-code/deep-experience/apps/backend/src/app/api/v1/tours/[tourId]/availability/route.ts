import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonOk, notFound, validationError } from "@/lib/response";
import { isBookingCutoffExceeded } from "@/lib/capacity";

// GET /api/v1/tours/:tourId/availability?dateFrom=...&dateTo=...
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tourId: string }> }
) {
  const { tourId } = await params;
  const { searchParams } = new URL(req.url);

  const tour = await prisma.tour.findUnique({
    where: { id: tourId },
    include: {
      capacityRules: { where: { isActive: true }, orderBy: { priority: "desc" } },
      closeOuts: true,
      pricingCategories: { orderBy: { sortOrder: "asc" } },
      rates: {
        where: { isActive: true },
        include: { ratePrices: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!tour || !tour.isActive) return notFound("Tour not found");

  const now = new Date();
  const dateFrom = searchParams.get("dateFrom")
    ? new Date(searchParams.get("dateFrom")!)
    : now;
  const dateTo = searchParams.get("dateTo")
    ? new Date(searchParams.get("dateTo")!)
    : new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  if (isNaN(dateFrom.getTime()) || isNaN(dateTo.getTime())) {
    return validationError([{ field: "dateFrom/dateTo", message: "invalid date" }]);
  }

  // Get existing schedules in the date range
  const existingSchedules = await prisma.tourSchedule.findMany({
    where: {
      tourId,
      startDateTime: { gte: dateFrom, lte: dateTo },
      status: { in: ["OPEN", "FULL"] },
    },
    orderBy: { startDateTime: "asc" },
  });

  // Build close-out lookup: date -> set of times (null = all closed)
  const closeOutMap = new Map<string, Set<string> | null>();
  for (const co of tour.closeOuts) {
    const dateKey = co.date.toISOString().split("T")[0];
    if (!co.startTime) {
      closeOutMap.set(dateKey, null); // all closed
    } else {
      const existing = closeOutMap.get(dateKey);
      if (existing === null) continue; // already fully closed
      const timeObj = JSON.parse(co.startTime);
      const timeKey = `${timeObj.hour}:${timeObj.minute}`;
      if (!existing) {
        closeOutMap.set(dateKey, new Set([timeKey]));
      } else {
        existing.add(timeKey);
      }
    }
  }

  // Build schedule lookup for existing slots
  const scheduleMap = new Map<string, typeof existingSchedules[0]>();
  for (const s of existingSchedules) {
    const key = s.startDateTime.toISOString();
    scheduleMap.set(key, s);
  }

  // Generate availability slots from rules
  type Slot = {
    date: string;
    time: string;
    capacity: number;
    scheduleId: string | null;
    isCutoffClosed: boolean;
    rates: {
      id: string;
      label: string;
      prices: { category: string; categoryLabel: string; priceCents: number }[];
    }[];
  };

  const slots: Slot[] = [];
  const ratesData = tour.rates.map((rate) => ({
    id: rate.id,
    label: rate.label,
    prices: tour.pricingCategories.map((cat) => {
      const rp = rate.ratePrices.find((p) => p.pricingCategoryId === cat.id);
      return {
        category: cat.id,
        categoryLabel: cat.label,
        priceCents: rp?.priceCents ?? 0,
      };
    }),
  }));

  // Iterate each day in the range
  const current = new Date(dateFrom);
  current.setHours(0, 0, 0, 0);
  const end = new Date(dateTo);
  end.setHours(23, 59, 59, 999);

  while (current <= end) {
    const dateKey = current.toISOString().split("T")[0];
    const dayOfWeek = current.getDay(); // 0=Sun

    // Check if fully closed
    if (closeOutMap.get(dateKey) === null) {
      current.setDate(current.getDate() + 1);
      continue;
    }

    const closedTimes = closeOutMap.get(dateKey);

    // Find matching rule (highest priority first, already sorted)
    for (const rule of tour.capacityRules) {
      let matches = false;
      const daysOfWeek: number[] = JSON.parse(rule.daysOfWeek);
      const startTimes: { hour: number; minute: number }[] = JSON.parse(rule.startTimes);

      switch (rule.ruleType) {
        case "WEEKLY":
          matches = daysOfWeek.includes(dayOfWeek);
          break;
        case "RANGE":
          if (rule.startDate && rule.endDate) {
            matches =
              current >= new Date(rule.startDate) &&
              current <= new Date(rule.endDate) &&
              daysOfWeek.includes(dayOfWeek);
          }
          break;
        case "SINGLE":
          if (rule.singleDate) {
            const sd = new Date(rule.singleDate);
            matches =
              current.getFullYear() === sd.getFullYear() &&
              current.getMonth() === sd.getMonth() &&
              current.getDate() === sd.getDate();
          }
          break;
        case "YEARLY":
          if (rule.startDate) {
            const yd = new Date(rule.startDate);
            matches =
              current.getMonth() === yd.getMonth() &&
              current.getDate() === yd.getDate();
          }
          break;
      }

      if (!matches) continue;

      // Generate slots for each start time
      for (const st of startTimes) {
        const timeKey = `${st.hour}:${st.minute}`;

        // Check if this specific time is closed
        if (closedTimes?.has(timeKey)) continue;

        const slotStart = new Date(current);
        slotStart.setHours(st.hour, st.minute, 0, 0);

        // Skip past slots
        if (slotStart < now) continue;

        // Check if existing schedule already covers this slot
        const existingKey = slotStart.toISOString();
        const existing = scheduleMap.get(existingKey);

        const capacity = existing ? existing.capacity : rule.capacity;
        const scheduleId = existing?.id ?? null;

        if (capacity > 0 || (existing && existing.status === "FULL")) {
          slots.push({
            date: dateKey,
            time: `${String(st.hour).padStart(2, "0")}:${String(st.minute).padStart(2, "0")}`,
            capacity: Math.max(0, capacity),
            scheduleId,
            isCutoffClosed: isBookingCutoffExceeded({
              startDateTime: slotStart,
              bookingCutoffMinutes: tour.bookingCutoffMinutes,
              now,
            }),
            rates: ratesData,
          });
        }
      }

      break; // Only use the highest-priority matching rule
    }

    current.setDate(current.getDate() + 1);
  }

  // Group by date
  const grouped: Record<string, typeof slots> = {};
  for (const slot of slots) {
    if (!grouped[slot.date]) grouped[slot.date] = [];
    grouped[slot.date].push(slot);
  }

  return jsonOk({
    availability: Object.entries(grouped).map(([date, dateSlots]) => ({
      date,
      slots: dateSlots,
    })),
  });
}
