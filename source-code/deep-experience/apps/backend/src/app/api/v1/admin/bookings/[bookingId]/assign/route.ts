import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonOk, notFound, jsonError, validationError } from "@/lib/response";

// POST /api/v1/admin/bookings/:bookingId/assign
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  const auth = requireAuth(req, "admin");
  if (auth instanceof Response) return auth;

  const { bookingId } = await params;
  const body = await req.json();

  if (!body.guideId) {
    return validationError([{ field: "guideId", message: "required" }]);
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
  });
  if (!booking) return notFound("Booking not found");

  if (booking.status !== "PENDING") {
    return jsonError(
      "CONFLICT",
      "Booking is not in PENDING status",
      409
    );
  }

  const guide = await prisma.guide.findUnique({
    where: { id: body.guideId },
  });
  if (!guide) return notFound("Guide not found");

  const assignment = await prisma.guideAssignment.create({
    data: {
      bookingId,
      guideId: body.guideId,
    },
  });

  return jsonOk(
    {
      id: assignment.id,
      bookingId: assignment.bookingId,
      guideId: assignment.guideId,
      status: assignment.status,
      assignedAt: assignment.assignedAt.toISOString(),
    },
    201
  );
}
