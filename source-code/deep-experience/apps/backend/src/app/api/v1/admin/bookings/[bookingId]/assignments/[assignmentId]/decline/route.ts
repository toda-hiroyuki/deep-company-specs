import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonOk, notFound, jsonError } from "@/lib/response";

// POST /api/v1/admin/bookings/:bookingId/assignments/:assignmentId/decline
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ bookingId: string; assignmentId: string }> }
) {
  const auth = requireAuth(req, "admin");
  if (auth instanceof Response) return auth;

  const { bookingId, assignmentId } = await params;
  const body = await req.json().catch(() => ({}));

  const assignment = await prisma.guideAssignment.findUnique({
    where: { id: assignmentId },
  });

  if (!assignment || assignment.bookingId !== bookingId) {
    return notFound("Assignment not found");
  }

  if (assignment.status !== "PENDING") {
    return jsonError("CONFLICT", "Assignment already responded", 409);
  }

  const updated = await prisma.guideAssignment.update({
    where: { id: assignmentId },
    data: {
      status: "DECLINED",
      declineReason: body.reason || null,
      respondedAt: new Date(),
    },
  });

  return jsonOk({
    id: updated.id,
    status: updated.status,
    declineReason: updated.declineReason,
    respondedAt: updated.respondedAt?.toISOString(),
  });
}
