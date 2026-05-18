import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonOk, notFound, validationError } from "@/lib/response";

// GET /api/v1/admin/spots/:spotId/media
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ spotId: string }> }
) {
  const auth = requireAuth(req, "admin");
  if (auth instanceof Response) return auth;

  const { spotId } = await params;
  const spotMedia = await prisma.spotMedia.findMany({
    where: { spotId },
    include: { media: true },
    orderBy: { sortOrder: "asc" },
  });

  return jsonOk({
    media: spotMedia.map((sm) => ({
      ...sm.media,
      sortOrder: sm.sortOrder,
      linkId: sm.id,
    })),
  });
}

// POST /api/v1/admin/spots/:spotId/media — link media to spot
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ spotId: string }> }
) {
  const auth = requireAuth(req, "admin");
  if (auth instanceof Response) return auth;

  const { spotId } = await params;
  const spot = await prisma.spot.findUnique({ where: { id: spotId } });
  if (!spot) return notFound("Spot not found");

  const body = await req.json();
  if (!body.mediaId) {
    return validationError([{ field: "mediaId", message: "required" }]);
  }

  const media = await prisma.media.findUnique({ where: { id: body.mediaId } });
  if (!media) return notFound("Media not found");

  const maxSort = await prisma.spotMedia.aggregate({
    where: { spotId },
    _max: { sortOrder: true },
  });

  const spotMedia = await prisma.spotMedia.upsert({
    where: { spotId_mediaId: { spotId, mediaId: body.mediaId } },
    update: { sortOrder: body.sortOrder ?? (maxSort._max.sortOrder ?? -1) + 1 },
    create: {
      spotId,
      mediaId: body.mediaId,
      sortOrder: body.sortOrder ?? (maxSort._max.sortOrder ?? -1) + 1,
    },
    include: { media: true },
  });

  return jsonOk(
    { ...spotMedia.media, sortOrder: spotMedia.sortOrder, linkId: spotMedia.id },
    201
  );
}

// PUT /api/v1/admin/spots/:spotId/media — reorder
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ spotId: string }> }
) {
  const auth = requireAuth(req, "admin");
  if (auth instanceof Response) return auth;

  const { spotId } = await params;
  const body = await req.json();

  if (!Array.isArray(body.media)) {
    return validationError([{ field: "media", message: "must be array of {mediaId, sortOrder}" }]);
  }

  for (const item of body.media) {
    await prisma.spotMedia.updateMany({
      where: { spotId, mediaId: item.mediaId },
      data: { sortOrder: item.sortOrder },
    });
  }

  const updated = await prisma.spotMedia.findMany({
    where: { spotId },
    include: { media: true },
    orderBy: { sortOrder: "asc" },
  });

  return jsonOk({
    media: updated.map((sm) => ({
      ...sm.media,
      sortOrder: sm.sortOrder,
      linkId: sm.id,
    })),
  });
}
