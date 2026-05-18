import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonOk, notFound, jsonError } from "@/lib/response";
import { createNotification } from "@/lib/notification";

// POST /api/v1/guide/assignments/:assignmentId/decline
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  const auth = requireAuth(req, "guide");
  if (auth instanceof Response) return auth;

  const { assignmentId } = await params;
  const body = await req.json().catch(() => ({}));

  const assignment = await prisma.guideAssignment.findUnique({
    where: { id: assignmentId },
    include: {
      booking: {
        include: { tourSchedule: { include: { tour: true } } },
      },
    },
  });

  if (!assignment || assignment.guideId !== auth.id) {
    return notFound("Assignment not found");
  }

  if (assignment.status !== "PENDING") {
    return jsonError("CONFLICT", "Assignment already responded", 409);
  }

  const tourTitle = assignment.booking.tourSchedule.tour.titleEn;

  const updated = await prisma.$transaction(async (tx) => {
    const a = await tx.guideAssignment.update({
      where: { id: assignmentId },
      data: {
        status: "DECLINED",
        declineReason: body.reason || null,
        respondedAt: new Date(),
      },
    });

    await createNotification(
      {
        recipientEmail: assignment.booking.travelerEmail,
        bookingId: assignment.bookingId,
        type: "GUIDE_DECLINED",
        titleEn: "Guide Assignment Update",
        messageEn: `We're finding another guide for your booking for ${tourTitle}. We'll notify you once confirmed.`,
      },
      tx
    );

    return a;
  });

  return jsonOk({
    id: updated.id,
    status: updated.status,
    respondedAt: updated.respondedAt?.toISOString(),
  });
}
