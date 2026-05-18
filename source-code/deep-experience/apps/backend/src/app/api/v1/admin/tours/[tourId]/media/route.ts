import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonOk, notFound, validationError } from "@/lib/response";

// GET /api/v1/admin/tours/:tourId/media
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tourId: string }> }
) {
  const auth = requireAuth(req, "admin");
  if (auth instanceof Response) return auth;

  const { tourId } = await params;
  const tourMedia = await prisma.tourMedia.findMany({
    where: { tourId },
    include: { media: true },
    orderBy: { sortOrder: "asc" },
  });

  return jsonOk({
    media: tourMedia.map((tm) => ({
      ...tm.media,
      sortOrder: tm.sortOrder,
      linkId: tm.id,
    })),
  });
}

// POST /api/v1/admin/tours/:tourId/media — link media to tour
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tourId: string }> }
) {
  const auth = requireAuth(req, "admin");
  if (auth instanceof Response) return auth;

  const { tourId } = await params;
  const tour = await prisma.tour.findUnique({ where: { id: tourId } });
  if (!tour) return notFound("Tour not found");

  const body = await req.json();
  if (!body.mediaId) {
    return validationError([{ field: "mediaId", message: "required" }]);
  }

  const media = await prisma.media.findUnique({ where: { id: body.mediaId } });
  if (!media) return notFound("Media not found");

  // Get next sortOrder
  const maxSort = await prisma.tourMedia.aggregate({
    where: { tourId },
    _max: { sortOrder: true },
  });

  const tourMedia = await prisma.tourMedia.upsert({
    where: { tourId_mediaId: { tourId, mediaId: body.mediaId } },
    update: { sortOrder: body.sortOrder ?? (maxSort._max.sortOrder ?? -1) + 1 },
    create: {
      tourId,
      mediaId: body.mediaId,
      sortOrder: body.sortOrder ?? (maxSort._max.sortOrder ?? -1) + 1,
    },
    include: { media: true },
  });

  return jsonOk(
    { ...tourMedia.media, sortOrder: tourMedia.sortOrder, linkId: tourMedia.id },
    201
  );
}

// PUT /api/v1/admin/tours/:tourId/media — reorder
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ tourId: string }> }
) {
  const auth = requireAuth(req, "admin");
  if (auth instanceof Response) return auth;

  const { tourId } = await params;
  const body = await req.json();

  if (!Array.isArray(body.media)) {
    return validationError([{ field: "media", message: "must be array of {mediaId, sortOrder}" }]);
  }

  for (const item of body.media) {
    await prisma.tourMedia.updateMany({
      where: { tourId, mediaId: item.mediaId },
      data: { sortOrder: item.sortOrder },
    });
  }

  const updated = await prisma.tourMedia.findMany({
    where: { tourId },
    include: { media: true },
    orderBy: { sortOrder: "asc" },
  });

  return jsonOk({
    media: updated.map((tm) => ({
      ...tm.media,
      sortOrder: tm.sortOrder,
      linkId: tm.id,
    })),
  });
}
