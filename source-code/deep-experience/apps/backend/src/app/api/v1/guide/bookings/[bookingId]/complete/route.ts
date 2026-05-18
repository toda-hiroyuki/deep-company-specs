import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonOk, notFound, jsonError } from "@/lib/response";

// POST /api/v1/guide/bookings/:bookingId/complete
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  const auth = requireAuth(req, "guide");
  if (auth instanceof Response) return auth;

  const { bookingId } = await params;

  const assignment = await prisma.guideAssignment.findFirst({
    where: { bookingId, guideId: auth.id, status: "ACCEPTED" },
  });
  if (!assignment) return notFound("Booking not found");

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
  });
  if (!booking || booking.status !== "IN_PROGRESS") {
    return jsonError("CONFLICT", "Booking is not in IN_PROGRESS status", 409);
  }

  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "COMPLETED" },
  });

  return jsonOk({ id: updated.id, status: updated.status });
}
