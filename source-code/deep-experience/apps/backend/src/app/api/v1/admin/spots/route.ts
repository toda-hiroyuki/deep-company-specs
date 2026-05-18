import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonOk, validationError } from "@/lib/response";

// GET /api/v1/admin/spots - List all spots
export async function GET(req: NextRequest) {
  const auth = requireAuth(req, "admin");
  if (auth instanceof Response) return auth;

  const spots = await prisma.spot.findMany({
    include: { tours: { where: { isActive: true }, select: { id: true } } },
    orderBy: { createdAt: "desc" },
  });

  return jsonOk({
    spots: spots.map((s) => ({
      ...s,
      imageUrls: JSON.parse(s.imageUrls),
      tourCount: s.tours.length,
      tours: undefined,
    })),
  });
}

// POST /api/v1/admin/spots - Create a new spot
export async function POST(req: NextRequest) {
  const auth = requireAuth(req, "admin");
  if (auth instanceof Response) return auth;

  const body = await req.json();

  const errors: { field: string; message: string }[] = [];
  if (!body.name) errors.push({ field: "name", message: "required" });
  if (body.lat == null) errors.push({ field: "lat", message: "required" });
  if (body.lng == null) errors.push({ field: "lng", message: "required" });

  if (errors.length > 0) return validationError(errors);

  const spot = await prisma.spot.create({
    data: {
      name: body.name,
      nameEn: body.nameEn || "",
      description: body.description || "",
      descriptionEn: body.descriptionEn || "",
      imageUrls: JSON.stringify(body.imageUrls || []),
      lat: body.lat,
      lng: body.lng,
      locationName: body.locationName || "",
      category: body.category || "",
      contactEmail: body.contactEmail ?? null,
      contactPhone: body.contactPhone ?? null,
      isActive: body.isActive ?? true,
    },
  });

  return jsonOk({ ...spot, imageUrls: JSON.parse(spot.imageUrls) }, 201);
}
