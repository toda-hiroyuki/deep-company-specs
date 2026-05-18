import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonOk } from "@/lib/response";

// DELETE /api/v1/guest/favorites/:tourId — remove from favorites. Idempotent.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ tourId: string }> }
) {
  const auth = requireAuth(req, "guest");
  if (auth instanceof Response) return auth;

  const { tourId } = await params;

  await prisma.favorite.deleteMany({
    where: { guestId: auth.id, tourId },
  });

  return jsonOk({ ok: true });
}
