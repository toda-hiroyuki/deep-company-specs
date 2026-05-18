import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonOk, validationError } from "@/lib/response";

// GET /api/v1/notifications?email=...
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");

  if (!email) {
    return validationError([{ field: "email", message: "required" }]);
  }

  const notifications = await prisma.notification.findMany({
    where: { recipientEmail: email },
    include: {
      booking: {
        include: {
          tourSchedule: {
            include: { tour: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return jsonOk({
    notifications: notifications.map((n) => ({
      id: n.id,
      type: n.type,
      titleEn: n.titleEn,
      messageEn: n.messageEn,
      isRead: n.isRead,
      createdAt: n.createdAt.toISOString(),
      booking: n.booking
        ? {
            id: n.booking.id,
            status: n.booking.status,
            tour: {
              title: n.booking.tourSchedule.tour.titleEn,
            },
          }
        : null,
    })),
  });
}
