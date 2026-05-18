import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonOk, notFound, validationError } from "@/lib/response";
import { doesRuleApplyToDate } from "@/lib/capacity/matchCapacityRuleForStart";

// POST /api/v1/admin/tours/:tourId/schedules/generate
// Generate TourSchedule records from CapacityRules for a date range
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tourId: string }> }
) {
  const auth = requireAuth(req, "admin");
  if (auth instanceof Response) return auth;

  const { tourId } = await params;
  const body = await req.json();

  const errors: { field: string; message: string }[] = [];
  if (!body.dateFrom) errors.push({ field: "dateFrom", message: "required" });
  if (!body.dateTo) errors.push({ field: "dateTo", message: "required" });
  if (errors.length > 0) return validationError(errors);

  const tour = await prisma.tour.findUnique({
    where: { id: tourId },
    include: {
      capacityRules: { where: { isActive: true }, orderBy: { priority: "desc" } },
      closeOuts: true,
    },
  });
  if (!tour) return notFound("Tour not found");

  const dateFrom = new Date(body.dateFrom);
  const dateTo = new Date(body.dateTo);

  if (isNaN(dateFrom.getTime()) || isNaN(dateTo.getTime())) {
    return validationError([{ field: "dateFrom/dateTo", message: "invalid date" }]);
  }

  // Build close-out lookup
  const closeOutMap = new Map<string, Set<string> | null>();
  for (const co of tour.closeOuts) {
    const dateKey = co.date.toISOString().split("T")[0];
    if (!co.startTime) {
      closeOutMap.set(dateKey, null); // all closed
    } else {
      const existing = closeOutMap.get(dateKey);
      if (existing === null) continue;
      const timeObj = JSON.parse(co.startTime);
      const timeKey = `${timeObj.hour}:${timeObj.minute}`;
      if (!existing) {
        closeOutMap.set(dateKey, new Set([timeKey]));
      } else {
        existing.add(timeKey);
      }
    }
  }

  // Get existing schedules in range to avoid duplicates
  const existingSchedules = await prisma.tourSchedule.findMany({
    where: {
      tourId,
      startDateTime: { gte: dateFrom, lte: new Date(dateTo.getTime() + 24 * 60 * 60 * 1000) },
    },
  });
  const existingSet = new Set(existingSchedules.map((s) => s.startDateTime.toISOString()));

  // Generate schedules
  const toCreate: { tourId: string; startDateTime: Date; endDateTime: Date; capacity: number; sourceRuleId: string }[] = [];
  const current = new Date(dateFrom);
  current.setHours(0, 0, 0, 0);
  const end = new Date(dateTo);
  end.setHours(23, 59, 59, 999);

  while (current <= end) {
    const dateKey = current.toISOString().split("T")[0];
    const dayOfWeek = current.getDay();

    // Skip fully closed dates
    if (closeOutMap.get(dateKey) === null) {
      current.setDate(current.getDate() + 1);
      continue;
    }

    const closedTimes = closeOutMap.get(dateKey);

    const dateInfo = {
      year: current.getFullYear(),
      month: current.getMonth() + 1,
      day: current.getDate(),
      dayOfWeek,
    };

    // Find highest-priority matching rule (tour.capacityRules is pre-sorted priority desc).
    for (const rule of tour.capacityRules) {
      if (!doesRuleApplyToDate(rule, dateInfo)) continue;
      const startTimes: { hour: number; minute: number }[] = JSON.parse(
        rule.startTimes
      );

      // Generate slots for each start time
      for (const st of startTimes) {
        const timeKey = `${st.hour}:${st.minute}`;
        if (closedTimes?.has(timeKey)) continue;

        const slotStart = new Date(current);
        slotStart.setHours(st.hour, st.minute, 0, 0);
        const slotEnd = new Date(slotStart.getTime() + tour.durationMinutes * 60 * 1000);

        // Skip if already exists
        if (existingSet.has(slotStart.toISOString())) continue;

        toCreate.push({
          tourId,
          startDateTime: new Date(slotStart),
          endDateTime: new Date(slotEnd),
          capacity: rule.capacity,
          sourceRuleId: rule.id,
        });

        // Track to prevent duplicates within this batch
        existingSet.add(slotStart.toISOString());
      }

      break; // Only use highest-priority matching rule
    }

    current.setDate(current.getDate() + 1);
  }

  // Bulk create
  if (toCreate.length > 0) {
    await prisma.tourSchedule.createMany({ data: toCreate });
  }

  return jsonOk({ created: toCreate.length });
}
