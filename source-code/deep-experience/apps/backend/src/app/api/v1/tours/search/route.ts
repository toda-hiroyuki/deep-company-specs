import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonOk, validationError } from "@/lib/response";
import { pickLocalized, resolveLocale } from "@/lib/locale";

// GET /api/v1/tours/search?lat=...&lng=...&radiusKm=...&lang=ja|en
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const locale = resolveLocale(req);

  const lat = parseFloat(searchParams.get("lat") || "");
  const lng = parseFloat(searchParams.get("lng") || "");

  if (isNaN(lat) || isNaN(lng)) {
    return validationError([
      { field: "lat", message: "valid latitude required" },
      { field: "lng", message: "valid longitude required" },
    ]);
  }

  const radiusKm = Math.min(
    parseFloat(searchParams.get("radiusKm") || "5"),
    20
  );
  const category = searchParams.get("category");
  const tourType = searchParams.get("tourType");
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
  const offset = parseInt(searchParams.get("offset") || "0");

  const now = new Date();
  const dateFrom = searchParams.get("dateFrom")
    ? new Date(searchParams.get("dateFrom")!)
    : now;
  const dateTo = searchParams.get("dateTo")
    ? new Date(searchParams.get("dateTo")!)
    : new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  // Fetch active tours with open schedules in the date range
  const tours = await prisma.tour.findMany({
    where: {
      isActive: true,
      ...(category && { category }),
      ...(tourType && { tourType }),
      schedules: {
        some: {
          status: { in: ["OPEN", "FULL"] },
          startDateTime: { gte: dateFrom, lte: dateTo },
        },
      },
    },
    include: {
      schedules: {
        where: {
          status: { in: ["OPEN", "FULL"] },
          startDateTime: { gte: dateFrom, lte: dateTo },
        },
        orderBy: { startDateTime: "asc" },
      },
      tourMedia: {
        include: { media: true },
        orderBy: { sortOrder: "asc" },
        take: 1,
      },
    },
  });

  // Filter by distance (Haversine approximation)
  const filtered = tours
    .map((tour) => {
      const distanceKm = haversineKm(
        lat,
        lng,
        tour.meetingPointLat,
        tour.meetingPointLng
      );
      return { tour, distanceKm };
    })
    .filter(({ distanceKm }) => distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);

  const total = filtered.length;
  const paged = filtered.slice(offset, offset + limit);

  return jsonOk({
    tours: paged.map(({ tour, distanceKm }) => {
      const nextSchedule = tour.schedules[0] || null;
      // Prefer linked media; fall back to legacy imageUrls
      const imageUrl = tour.tourMedia.length > 0
        ? tour.tourMedia[0].media.originalUrl
        : (JSON.parse(tour.imageUrls) as string[])[0] || null;
      return {
        id: tour.id,
        title: pickLocalized(locale, tour.title, tour.titleEn),
        category: tour.category,
        tourType: tour.tourType,
        meetingPoint: {
          lat: tour.meetingPointLat,
          lng: tour.meetingPointLng,
          name: tour.meetingPointName,
        },
        durationMinutes: tour.durationMinutes,
        pricePerPersonCents: tour.pricePerPersonCents,
        currency: "USD",
        maxParticipants: tour.maxParticipants,
        imageUrl,
        nextSchedule: nextSchedule
          ? {
              id: nextSchedule.id,
              startDateTime: nextSchedule.startDateTime.toISOString(),
              endDateTime: nextSchedule.endDateTime.toISOString(),
              remainingSlots: nextSchedule.capacity,
              status: nextSchedule.status,
            }
          : null,
        schedulesCount: tour.schedules.length,
        distanceKm: Math.round(distanceKm * 10) / 10,
      };
    }),
    total,
    limit,
    offset,
  });
}

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}
