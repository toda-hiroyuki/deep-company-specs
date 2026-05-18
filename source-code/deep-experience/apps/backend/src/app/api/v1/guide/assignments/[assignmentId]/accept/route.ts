import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonOk, notFound, jsonError } from "@/lib/response";
import { createNotification } from "@/lib/notification";

// POST /api/v1/guide/assignments/:assignmentId/accept
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  const auth = requireAuth(req, "guide");
  if (auth instanceof Response) return auth;

  const { assignmentId } = await params;

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

  const updated = await prisma.$transaction(async (tx) => {
    const a = await tx.guideAssignment.update({
      where: { id: assignmentId },
      data: { status: "ACCEPTED", respondedAt: new Date() },
    });

    await tx.booking.update({
      where: { id: assignment.bookingId },
      data: { status: "CONFIRMED" },
    });

    const tourTitle = assignment.booking.tourSchedule.tour.titleEn;
    await createNotification(
      {
        recipientEmail: assignment.booking.travelerEmail,
        bookingId: assignment.bookingId,
        type: "BOOKING_CONFIRMED",
        titleEn: "Booking Confirmed",
        messageEn: `Your booking for ${tourTitle} has been confirmed!`,
      },
      tx
    );

    return a;
  });

  return jsonOk({
    id: updated.id,
    status: updated.status,
    respondedAt: updated.respondedAt?.toISOString(),
    booking: {
      id: assignment.bookingId,
      status: "CONFIRMED",
    },
  });
}
