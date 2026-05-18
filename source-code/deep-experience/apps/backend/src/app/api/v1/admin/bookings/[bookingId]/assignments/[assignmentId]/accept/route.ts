import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonOk, notFound, jsonError } from "@/lib/response";

// POST /api/v1/admin/bookings/:bookingId/assignments/:assignmentId/accept
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ bookingId: string; assignmentId: string }> }
) {
  const auth = requireAuth(req, "admin");
  if (auth instanceof Response) return auth;

  const { bookingId, assignmentId } = await params;

  const assignment = await prisma.guideAssignment.findUnique({
    where: { id: assignmentId },
  });

  if (!assignment || assignment.bookingId !== bookingId) {
    return notFound("Assignment not found");
  }

  if (assignment.status !== "PENDING") {
    return jsonError("CONFLICT", "Assignment already responded", 409);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const a = await tx.guideAssignment.update({
      where: { id: assignmentId },
      data: { status: "ACCEPTED", respondedAt: new Date() },
    });

    await tx.booking.update({
      where: { id: bookingId },
      data: { status: "CONFIRMED" },
    });

    return a;
  });

  return jsonOk({
    id: updated.id,
    status: updated.status,
    respondedAt: updated.respondedAt?.toISOString(),
    booking: {
      id: bookingId,
      status: "CONFIRMED",
    },
  });
}
