import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonOk, validationError, jsonError } from "@/lib/response";

// GET /api/v1/guest/favorites — list the authenticated guest's favorite tours.
export async function GET(req: NextRequest) {
  const auth = requireAuth(req, "guest");
  if (auth instanceof Response) return auth;

  const favorites = await prisma.favorite.findMany({
    where: { guestId: auth.id },
    orderBy: { createdAt: "desc" },
    include: {
      tour: {
        select: {
          id: true,
          title: true,
          titleEn: true,
          category: true,
          tourType: true,
          imageUrls: true,
          meetingPointName: true,
          pricePerPersonCents: true,
          durationMinutes: true,
          isActive: true,
        },
      },
    },
  });

  return jsonOk({
    favorites: favorites
      .filter((f) => f.tour.isActive)
      .map((f) => {
        const imageUrls = JSON.parse(f.tour.imageUrls) as string[];
        return {
          id: f.id,
          createdAt: f.createdAt.toISOString(),
          tour: {
            id: f.tour.id,
            title: f.tour.titleEn,
            titleJa: f.tour.title,
            category: f.tour.category,
            tourType: f.tour.tourType,
            imageUrl: imageUrls[0] ?? null,
            meetingPointName: f.tour.meetingPointName,
            pricePerPersonCents: f.tour.pricePerPersonCents,
            durationMinutes: f.tour.durationMinutes,
          },
        };
      }),
  });
}

// POST /api/v1/guest/favorites — add a tour to favorites. Idempotent.
export async function POST(req: NextRequest) {
  const auth = requireAuth(req, "guest");
  if (auth instanceof Response) return auth;

  const body = await req.json().catch(() => ({}));
  const tourId = typeof body?.tourId === "string" ? body.tourId.trim() : "";
  if (!tourId) {
    return validationError([{ field: "tourId", message: "required" }]);
  }

  const tour = await prisma.tour.findUnique({
    where: { id: tourId },
    select: { id: true, isActive: true },
  });
  if (!tour || !tour.isActive) {
    return jsonError("NOT_FOUND", "Tour not found", 404);
  }

  const favorite = await prisma.favorite.upsert({
    where: { guestId_tourId: { guestId: auth.id, tourId } },
    create: { guestId: auth.id, tourId },
    update: {},
    select: { id: true, createdAt: true },
  });

  return jsonOk(
    {
      id: favorite.id,
      tourId,
      createdAt: favorite.createdAt.toISOString(),
    },
    201
  );
}
