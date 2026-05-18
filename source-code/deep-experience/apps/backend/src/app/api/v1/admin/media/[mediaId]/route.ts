import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonOk, notFound, jsonError } from "@/lib/response";
import { getStorageProvider } from "@/lib/storage/factory";

// GET /api/v1/admin/media/:mediaId
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ mediaId: string }> }
) {
  const auth = requireAuth(req, "admin");
  if (auth instanceof Response) return auth;

  const { mediaId } = await params;
  const media = await prisma.media.findUnique({
    where: { id: mediaId },
    include: {
      tourMedia: { include: { tour: { select: { id: true, title: true, titleEn: true } } } },
      spotMedia: { include: { spot: { select: { id: true, name: true } } } },
    },
  });

  if (!media) return notFound("Media not found");

  return jsonOk({
    ...media,
    linkedTours: media.tourMedia.map((tm) => ({
      tourId: tm.tour.id,
      title: tm.tour.title,
      titleEn: tm.tour.titleEn,
      sortOrder: tm.sortOrder,
    })),
    linkedSpots: media.spotMedia.map((sm) => ({
      spotId: sm.spot.id,
      name: sm.spot.name,
      sortOrder: sm.sortOrder,
    })),
    tourMedia: undefined,
    spotMedia: undefined,
  });
}

// PATCH /api/v1/admin/media/:mediaId
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ mediaId: string }> }
) {
  const auth = requireAuth(req, "admin");
  if (auth instanceof Response) return auth;

  const { mediaId } = await params;
  const media = await prisma.media.findUnique({ where: { id: mediaId } });
  if (!media) return notFound("Media not found");

  const body = await req.json();
  const updated = await prisma.media.update({
    where: { id: mediaId },
    data: {
      ...(body.alt !== undefined && { alt: body.alt }),
    },
  });

  return jsonOk(updated);
}

// DELETE /api/v1/admin/media/:mediaId
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ mediaId: string }> }
) {
  const auth = requireAuth(req, "admin");
  if (auth instanceof Response) return auth;

  const { mediaId } = await params;
  const media = await prisma.media.findUnique({
    where: { id: mediaId },
    include: { _count: { select: { tourMedia: true, spotMedia: true } } },
  });

  if (!media) return notFound("Media not found");

  const linkCount = media._count.tourMedia + media._count.spotMedia;
  if (linkCount > 0) {
    return jsonError(
      "MEDIA_IN_USE",
      `Cannot delete: linked to ${media._count.tourMedia} tour(s) and ${media._count.spotMedia} spot(s). Unlink first.`,
      409
    );
  }

  // Delete files from storage
  const storage = getStorageProvider();
  await storage.delete(media.originalUrl, media.thumbnailUrl);

  await prisma.media.delete({ where: { id: mediaId } });

  return jsonOk({ id: mediaId, deleted: true });
}
