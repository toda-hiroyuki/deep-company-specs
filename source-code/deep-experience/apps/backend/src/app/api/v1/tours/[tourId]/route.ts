import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonOk, notFound } from "@/lib/response";
import { pickLocalized, resolveLocale } from "@/lib/locale";

// GET /api/v1/tours/:tourId?lang=ja|en
//
// Locale selection: ?lang= wins, else Accept-Language header, else "en".
// The Tour model carries paired ja/En fields (title/titleEn, description/...).
// Callers used to receive English unconditionally; that broke Japanese-locale
// users who were seeing English content despite a JP UI.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tourId: string }> }
) {
  const { tourId } = await params;
  const locale = resolveLocale(req);

  const tour = await prisma.tour.findUnique({
    where: { id: tourId },
    include: {
      tourMedia: { include: { media: true }, orderBy: { sortOrder: "asc" } },
    },
  });
  if (!tour || !tour.isActive) return notFound("Tour not found");

  const title = pickLocalized(locale, tour.title, tour.titleEn);
  const description = pickLocalized(locale, tour.description, tour.descriptionEn);

  // Two distinct image roles, kept separate (TripAdvisor / Booking.com style):
  //   imageUrls   = cover / main display images (Tour.imageUrls JSON column)
  //   gallery     = photo gallery linked via TourMedia (reusable Media records)
  // imageUrls is also returned as a flat array for back-compat with existing
  // callers (TourCard etc.) — first entry is treated as the hero.
  const coverImageUrls: string[] = JSON.parse(tour.imageUrls);
  const gallery = tour.tourMedia.map((tm) => ({
    id: tm.media.id,
    url: tm.media.originalUrl,
    thumbnailUrl: tm.media.thumbnailUrl,
    alt: tm.media.alt || title,
  }));

  return jsonOk({
    id: tour.id,
    title,
    description,
    imageUrls: coverImageUrls,
    gallery,
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
  });
}
