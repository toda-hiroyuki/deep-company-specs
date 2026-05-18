import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonOk, notFound, validationError } from "@/lib/response";
import { validateCancellationSettings } from "@/lib/tour/validateCancellationSettings";

// Safe JSON array parse helper
function safeParseJsonArray(val: string | null): unknown[] {
  if (!val) return [];
  try {
    return JSON.parse(val);
  } catch {
    return [];
  }
}

// GET /api/v1/admin/tours/:tourId
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tourId: string }> }
) {
  const auth = requireAuth(req, "admin");
  if (auth instanceof Response) return auth;

  const { tourId } = await params;
  const tour = await prisma.tour.findUnique({
    where: { id: tourId },
    include: {
      schedules: { orderBy: { startDateTime: "asc" } },
      pricingCategories: {
        orderBy: { sortOrder: "asc" },
        include: { ratePrices: true },
      },
      rates: {
        orderBy: { createdAt: "asc" },
        include: { ratePrices: true },
      },
      capacityRules: { orderBy: { priority: "desc" } },
      closeOuts: { orderBy: { date: "asc" } },
    },
  });

  if (!tour) return notFound("Tour not found");

  return jsonOk({
    ...tour,
    imageUrls: JSON.parse(tour.imageUrls),
    supportedLanguages: safeParseJsonArray(tour.supportedLanguages),
    tags: safeParseJsonArray(tour.tags),
    capacityRules: tour.capacityRules.map((r) => ({
      ...r,
      daysOfWeek: JSON.parse(r.daysOfWeek),
      startTimes: JSON.parse(r.startTimes),
    })),
    closeOuts: tour.closeOuts.map((co) => ({
      ...co,
      startTime: co.startTime ? JSON.parse(co.startTime) : null,
    })),
  });
}

// PUT /api/v1/admin/tours/:tourId
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ tourId: string }> }
) {
  const auth = requireAuth(req, "admin");
  if (auth instanceof Response) return auth;

  const { tourId } = await params;
  const body = await req.json();

  const existing = await prisma.tour.findUnique({ where: { id: tourId } });
  if (!existing) return notFound("Tour not found");

  const cancellationIssues = validateCancellationSettings(
    {
      bookingCutoffMinutes: body.bookingCutoffMinutes,
      freeCancellationDeadlineHours: body.freeCancellationDeadlineHours,
    },
    {
      bookingCutoffMinutes: existing.bookingCutoffMinutes,
      freeCancellationDeadlineHours: existing.freeCancellationDeadlineHours,
    }
  );
  if (cancellationIssues.length > 0) return validationError(cancellationIssues);

  const tour = await prisma.tour.update({
    where: { id: tourId },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.titleEn !== undefined && { titleEn: body.titleEn }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.descriptionEn !== undefined && {
        descriptionEn: body.descriptionEn,
      }),
      ...(body.imageUrls !== undefined && {
        imageUrls: JSON.stringify(body.imageUrls),
      }),
      ...(body.meetingPointLat !== undefined && {
        meetingPointLat: body.meetingPointLat,
      }),
      ...(body.meetingPointLng !== undefined && {
        meetingPointLng: body.meetingPointLng,
      }),
      ...(body.meetingPointName !== undefined && {
        meetingPointName: body.meetingPointName,
      }),
      ...(body.durationMinutes !== undefined && {
        durationMinutes: body.durationMinutes,
      }),
      ...(body.pricePerPersonCents !== undefined && {
        pricePerPersonCents: body.pricePerPersonCents,
      }),
      ...(body.maxParticipants !== undefined && {
        maxParticipants: body.maxParticipants,
      }),
      ...(body.tourType !== undefined && { tourType: body.tourType }),
      ...(body.category !== undefined && { category: body.category }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
      ...(body.spotId !== undefined && { spotId: body.spotId }),
      ...(body.area !== undefined && { area: body.area }),
      ...(body.areaDetail !== undefined && { areaDetail: body.areaDetail }),
      ...(body.cancellationPolicy !== undefined && {
        cancellationPolicy: body.cancellationPolicy,
      }),
      ...(body.paymentMethod !== undefined && {
        paymentMethod: body.paymentMethod,
      }),
      ...(body.supportedLanguages !== undefined && {
        supportedLanguages: JSON.stringify(body.supportedLanguages),
      }),
      ...(body.highlightsJa !== undefined && {
        highlightsJa: body.highlightsJa,
      }),
      ...(body.highlightsEn !== undefined && {
        highlightsEn: body.highlightsEn,
      }),
      ...(body.inclusionsJa !== undefined && {
        inclusionsJa: body.inclusionsJa,
      }),
      ...(body.inclusionsEn !== undefined && {
        inclusionsEn: body.inclusionsEn,
      }),
      ...(body.importantNotesJa !== undefined && {
        importantNotesJa: body.importantNotesJa,
      }),
      ...(body.importantNotesEn !== undefined && {
        importantNotesEn: body.importantNotesEn,
      }),
      ...(body.bookingNotesJa !== undefined && {
        bookingNotesJa: body.bookingNotesJa,
      }),
      ...(body.bookingNotesEn !== undefined && {
        bookingNotesEn: body.bookingNotesEn,
      }),
      ...(body.meetingPointDescJa !== undefined && {
        meetingPointDescJa: body.meetingPointDescJa,
      }),
      ...(body.meetingPointDescEn !== undefined && {
        meetingPointDescEn: body.meetingPointDescEn,
      }),
      ...(body.accessInfoJa !== undefined && {
        accessInfoJa: body.accessInfoJa,
      }),
      ...(body.accessInfoEn !== undefined && {
        accessInfoEn: body.accessInfoEn,
      }),
      ...(body.tags !== undefined && {
        tags: JSON.stringify(body.tags),
      }),
      ...(body.bookingType !== undefined && { bookingType: body.bookingType }),
      ...(body.meetingType !== undefined && { meetingType: body.meetingType }),
      ...(body.ticketSupport !== undefined && { ticketSupport: body.ticketSupport }),
      ...(body.capacityModel !== undefined && { capacityModel: body.capacityModel }),
      ...(body.dailyCapacity !== undefined && { dailyCapacity: body.dailyCapacity }),
      ...(body.maxDeparturesPerDay !== undefined && { maxDeparturesPerDay: body.maxDeparturesPerDay }),
      ...(body.bookingCutoffMinutes !== undefined && { bookingCutoffMinutes: body.bookingCutoffMinutes }),
      ...(body.freeCancellationDeadlineHours !== undefined && { freeCancellationDeadlineHours: body.freeCancellationDeadlineHours }),
    },
  });

  return jsonOk({
    ...tour,
    imageUrls: JSON.parse(tour.imageUrls),
    supportedLanguages: safeParseJsonArray(tour.supportedLanguages),
    tags: safeParseJsonArray(tour.tags),
  });
}

// DELETE /api/v1/admin/tours/:tourId (soft delete)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ tourId: string }> }
) {
  const auth = requireAuth(req, "admin");
  if (auth instanceof Response) return auth;

  const { tourId } = await params;
  const existing = await prisma.tour.findUnique({ where: { id: tourId } });
  if (!existing) return notFound("Tour not found");

  const tour = await prisma.tour.update({
    where: { id: tourId },
    data: { isActive: false },
  });

  return jsonOk({ id: tour.id, isActive: tour.isActive });
}
