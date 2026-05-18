import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonOk, notFound } from "@/lib/response";

// DELETE /api/v1/admin/tours/:tourId/media/:mediaId — unlink
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ tourId: string; mediaId: string }> }
) {
  const auth = requireAuth(req, "admin");
  if (auth instanceof Response) return auth;

  const { tourId, mediaId } = await params;
  const link = await prisma.tourMedia.findUnique({
    where: { tourId_mediaId: { tourId, mediaId } },
  });

  if (!link) return notFound("Media not linked to this tour");

  await prisma.tourMedia.delete({
    where: { tourId_mediaId: { tourId, mediaId } },
  });

  return jsonOk({ tourId, mediaId, unlinked: true });
}
