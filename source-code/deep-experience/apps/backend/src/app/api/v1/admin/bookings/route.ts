import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonOk } from "@/lib/response";

// GET /api/v1/admin/bookings
export async function GET(req: NextRequest) {
  const auth = requireAuth(req, "admin");
  if (auth instanceof Response) return auth;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const bookings = await prisma.booking.findMany({
    where: status ? { status } : undefined,
    include: {
      tourSchedule: { include: { tour: true } },
      assignments: { include: { guide: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return jsonOk({
    bookings: bookings.map((b) => ({
      id: b.id,
      status: b.status,
      assignmentState: b.assignmentState,
      travelerName: b.travelerName,
      travelerEmail: b.travelerEmail,
      numberOfGuests: b.numberOfGuests,
      createdAt: b.createdAt.toISOString(),
      tour: {
        id: b.tourSchedule.tour.id,
        title: b.tourSchedule.tour.title,
        durationMinutes: b.tourSchedule.tour.durationMinutes,
      },
      schedule: {
        id: b.tourSchedule.id,
        startDateTime: b.tourSchedule.startDateTime.toISOString(),
        endDateTime: b.tourSchedule.endDateTime.toISOString(),
        meetingPointName: b.tourSchedule.tour.meetingPointName,
      },
      assignments: b.assignments.map((a) => ({
        id: a.id,
        status: a.status,
        guideName: a.guide.name,
        guideId: a.guide.id,
        declineReason: a.declineReason,
      })),
    })),
  });
}
