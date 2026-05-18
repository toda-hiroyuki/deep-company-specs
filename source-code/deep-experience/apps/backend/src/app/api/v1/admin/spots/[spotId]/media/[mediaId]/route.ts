import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonOk, notFound } from "@/lib/response";

// DELETE /api/v1/admin/spots/:spotId/media/:mediaId — unlink
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ spotId: string; mediaId: string }> }
) {
  const auth = requireAuth(req, "admin");
  if (auth instanceof Response) return auth;

  const { spotId, mediaId } = await params;
  const link = await prisma.spotMedia.findUnique({
    where: { spotId_mediaId: { spotId, mediaId } },
  });

  if (!link) return notFound("Media not linked to this spot");

  await prisma.spotMedia.delete({
    where: { spotId_mediaId: { spotId, mediaId } },
  });

  return jsonOk({ spotId, mediaId, unlinked: true });
}
