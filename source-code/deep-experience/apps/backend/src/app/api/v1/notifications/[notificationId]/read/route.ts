import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonOk, notFound } from "@/lib/response";

// POST /api/v1/notifications/:notificationId/read
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ notificationId: string }> }
) {
  const { notificationId } = await params;

  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notification) {
    return notFound("Notification not found");
  }

  // Idempotent: if already read, return as-is
  if (notification.isRead) {
    return jsonOk({
      id: notification.id,
      isRead: notification.isRead,
      readAt: notification.readAt?.toISOString(),
    });
  }

  const updated = await prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true, readAt: new Date() },
  });

  return jsonOk({
    id: updated.id,
    isRead: updated.isRead,
    readAt: updated.readAt?.toISOString(),
  });
}
