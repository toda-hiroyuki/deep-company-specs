import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonOk, notFound } from "@/lib/response";

// GET /api/v1/guide/assignments/:assignmentId
export async function GET(
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

  return jsonOk({
    id: assignment.id,
    status: assignment.status,
    assignedAt: assignment.assignedAt.toISOString(),
    respondedAt: assignment.respondedAt?.toISOString() || null,
    booking: {
      id: assignment.booking.id,
      numberOfGuests: assignment.booking.numberOfGuests,
      status: assignment.booking.status,
      travelerName: assignment.booking.travelerName,
      specialRequests: assignment.booking.specialRequests,
    },
    tour: {
      id: assignment.booking.tourSchedule.tour.id,
      title: assignment.booking.tourSchedule.tour.titleEn,
      durationMinutes: assignment.booking.tourSchedule.tour.durationMinutes,
      pricePerPersonCents: assignment.booking.tourSchedule.tour.pricePerPersonCents,
      currency: "USD",
    },
    schedule: {
      id: assignment.booking.tourSchedule.id,
      startDateTime: assignment.booking.tourSchedule.startDateTime.toISOString(),
      endDateTime: assignment.booking.tourSchedule.endDateTime.toISOString(),
      meetingPoint: {
        lat: assignment.booking.tourSchedule.tour.meetingPointLat,
        lng: assignment.booking.tourSchedule.tour.meetingPointLng,
        name: assignment.booking.tourSchedule.tour.meetingPointName,
      },
    },
  });
}
