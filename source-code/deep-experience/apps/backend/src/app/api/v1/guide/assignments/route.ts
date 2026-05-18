import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonOk } from "@/lib/response";

// GET /api/v1/guide/assignments
export async function GET(req: NextRequest) {
  const auth = requireAuth(req, "guide");
  if (auth instanceof Response) return auth;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const assignments = await prisma.guideAssignment.findMany({
    where: {
      guideId: auth.id,
      ...(status && { status }),
    },
    include: {
      booking: {
        include: { tourSchedule: { include: { tour: true } } },
      },
    },
    orderBy: { assignedAt: "desc" },
  });

  return jsonOk({
    assignments: assignments.map((a) => ({
      id: a.id,
      status: a.status,
      assignedAt: a.assignedAt.toISOString(),
      booking: {
        id: a.booking.id,
        numberOfGuests: a.booking.numberOfGuests,
        status: a.booking.status,
        travelerName: a.booking.travelerName,
      },
      tour: {
        title: a.booking.tourSchedule.tour.titleEn,
      },
      schedule: {
        startDateTime: a.booking.tourSchedule.startDateTime.toISOString(),
        meetingPointName: a.booking.tourSchedule.tour.meetingPointName,
      },
    })),
  });
}
