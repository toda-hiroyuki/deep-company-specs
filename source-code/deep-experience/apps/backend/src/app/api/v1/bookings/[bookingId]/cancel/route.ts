import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonOk, notFound, jsonError } from "@/lib/response";

// POST /api/v1/bookings/:bookingId/cancel — guest must own the booking.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  const auth = requireAuth(req, "guest");
  if (auth instanceof Response) return auth;

  const { bookingId } = await params;

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { tourSchedule: true },
  });

  if (!booking || booking.guestId !== auth.id) {
    return notFound("Booking not found");
  }

  if (!["PENDING", "CONFIRMED"].includes(booking.status)) {
    return jsonError("CONFLICT", "Booking cannot be cancelled", 409);
  }

  // Check 2-hour cancellation deadline
  const deadline = new Date(
    booking.tourSchedule.startDateTime.getTime() - 2 * 60 * 60 * 1000
  );
  if (new Date() > deadline) {
    return jsonError(
      "CONFLICT",
      "Cannot cancel within 2 hours of tour start",
      409
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    const b = await tx.booking.update({
      where: { id: bookingId },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    });

    // Restore capacity. Only flip FULL -> OPEN automatically. An admin-set
    // CANCELLED must never resurrect on its own, and OPEN/COMPLETED should be
    // left untouched.
    const currentSchedule = await tx.tourSchedule.findUnique({
      where: { id: booking.tourScheduleId },
    });
    const nextStatus =
      currentSchedule?.status === "FULL" ? "OPEN" : currentSchedule?.status;
    await tx.tourSchedule.update({
      where: { id: booking.tourScheduleId },
      data: {
        capacity: {
          increment: booking.numberOfGuests,
        },
        ...(nextStatus && nextStatus !== currentSchedule?.status
          ? { status: nextStatus }
          : {}),
      },
    });

    return b;
  });

  return jsonOk({
    id: updated.id,
    status: updated.status,
    cancelledAt: updated.cancelledAt?.toISOString(),
  });
}
