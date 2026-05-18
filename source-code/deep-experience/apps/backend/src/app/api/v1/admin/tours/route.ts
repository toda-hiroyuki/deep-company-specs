import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonOk, validationError } from "@/lib/response";
import { validateCancellationSettings } from "@/lib/tour/validateCancellationSettings";

// GET /api/v1/admin/tours - List all tours
export async function GET(req: NextRequest) {
  const auth = requireAuth(req, "admin");
  if (auth instanceof Response) return auth;

  const tours = await prisma.tour.findMany({
    include: { schedules: { where: { status: { not: "CANCELLED" } } } },
    orderBy: { createdAt: "desc" },
  });

  return jsonOk({
    tours: tours.map((t) => ({
      ...t,
      imageUrls: JSON.parse(t.imageUrls),
      schedulesCount: t.schedules.length,
      schedules: undefined,
    })),
  });
}

// POST /api/v1/admin/tours - Create a new tour
export async function POST(req: NextRequest) {
  const auth = requireAuth(req, "admin");
  if (auth instanceof Response) return auth;

  const body = await req.json();

  const errors: { field: string; message: string }[] = [];
  if (!body.title) errors.push({ field: "title", message: "required" });
  if (!body.titleEn) errors.push({ field: "titleEn", message: "required" });
  if (!body.description)
    errors.push({ field: "description", message: "required" });
  if (!body.descriptionEn)
    errors.push({ field: "descriptionEn", message: "required" });
  if (body.meetingPointLat == null)
    errors.push({ field: "meetingPointLat", message: "required" });
  if (body.meetingPointLng == null)
    errors.push({ field: "meetingPointLng", message: "required" });
  if (!body.meetingPointName)
    errors.push({ field: "meetingPointName", message: "required" });
  if (!body.durationMinutes)
    errors.push({ field: "durationMinutes", message: "required" });
  if (body.pricePerPersonCents == null)
    errors.push({ field: "pricePerPersonCents", message: "required" });
  if (!body.maxParticipants)
    errors.push({ field: "maxParticipants", message: "required" });
  if (!body.category) errors.push({ field: "category", message: "required" });

  errors.push(
    ...validateCancellationSettings({
      bookingCutoffMinutes: body.bookingCutoffMinutes ?? null,
      freeCancellationDeadlineHours: body.freeCancellationDeadlineHours ?? null,
    })
  );

  if (errors.length > 0) return validationError(errors);

  const tour = await prisma.tour.create({
    data: {
      title: body.title,
      titleEn: body.titleEn,
      description: body.description,
      descriptionEn: body.descriptionEn,
      imageUrls: JSON.stringify(body.imageUrls || []),
      meetingPointLat: body.meetingPointLat,
      meetingPointLng: body.meetingPointLng,
      meetingPointName: body.meetingPointName,
      durationMinutes: body.durationMinutes,
      pricePerPersonCents: body.pricePerPersonCents,
      maxParticipants: body.maxParticipants,
      tourType: body.tourType || "GROUP",
      category: body.category,
      dailyCapacity: body.dailyCapacity ?? null,
      maxDeparturesPerDay: body.maxDeparturesPerDay ?? null,
      bookingCutoffMinutes: body.bookingCutoffMinutes ?? null,
      freeCancellationDeadlineHours: body.freeCancellationDeadlineHours ?? null,
    },
  });

  return jsonOk({ ...tour, imageUrls: JSON.parse(tour.imageUrls) }, 201);
}
