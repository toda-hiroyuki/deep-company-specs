import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonOk, notFound } from "@/lib/response";

// GET /api/v1/admin/spots/:spotId
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ spotId: string }> }
) {
  const auth = requireAuth(req, "admin");
  if (auth instanceof Response) return auth;

  const { spotId } = await params;
  const spot = await prisma.spot.findUnique({
    where: { id: spotId },
    include: {
      tours: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          titleEn: true,
          category: true,
          isActive: true,
        },
      },
    },
  });

  if (!spot) return notFound("Spot not found");

  return jsonOk({ ...spot, imageUrls: JSON.parse(spot.imageUrls) });
}

// PUT /api/v1/admin/spots/:spotId
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ spotId: string }> }
) {
  const auth = requireAuth(req, "admin");
  if (auth instanceof Response) return auth;

  const { spotId } = await params;
  const body = await req.json();

  const existing = await prisma.spot.findUnique({ where: { id: spotId } });
  if (!existing) return notFound("Spot not found");

  const spot = await prisma.spot.update({
    where: { id: spotId },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.nameEn !== undefined && { nameEn: body.nameEn }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.descriptionEn !== undefined && {
        descriptionEn: body.descriptionEn,
      }),
      ...(body.imageUrls !== undefined && {
        imageUrls: JSON.stringify(body.imageUrls),
      }),
      ...(body.lat !== undefined && { lat: body.lat }),
      ...(body.lng !== undefined && { lng: body.lng }),
      ...(body.locationName !== undefined && {
        locationName: body.locationName,
      }),
      ...(body.category !== undefined && { category: body.category }),
      ...(body.contactEmail !== undefined && {
        contactEmail: body.contactEmail,
      }),
      ...(body.contactPhone !== undefined && {
        contactPhone: body.contactPhone,
      }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
    },
  });

  return jsonOk({ ...spot, imageUrls: JSON.parse(spot.imageUrls) });
}

// DELETE /api/v1/admin/spots/:spotId (soft delete)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ spotId: string }> }
) {
  const auth = requireAuth(req, "admin");
  if (auth instanceof Response) return auth;

  const { spotId } = await params;
  const existing = await prisma.spot.findUnique({ where: { id: spotId } });
  if (!existing) return notFound("Spot not found");

  const spot = await prisma.spot.update({
    where: { id: spotId },
    data: { isActive: false },
  });

  return jsonOk({ id: spot.id, isActive: spot.isActive });
}
