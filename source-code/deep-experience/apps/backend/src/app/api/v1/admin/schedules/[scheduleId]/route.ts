import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import {
  jsonOk,
  jsonError,
  notFound,
  validationError,
} from "@/lib/response";
import {
  scheduleSummaryInclude,
  summarizeSchedule,
} from "@/lib/booking/scheduleSummary";

// GET /api/v1/admin/schedules/:scheduleId
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ scheduleId: string }> }
) {
  const auth = requireAuth(req, "admin");
  if (auth instanceof Response) return auth;

  const { scheduleId } = await params;
  const row = await prisma.tourSchedule.findUnique({
    where: { id: scheduleId },
    include: scheduleSummaryInclude,
  });
  if (!row) return notFound("Schedule not found");

  return jsonOk(summarizeSchedule(row));
}

// PUT /api/v1/admin/schedules/:scheduleId
// General-purpose update for startDateTime / endDateTime / capacity.
// Status transitions are NOT allowed here — use PATCH.
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ scheduleId: string }> }
) {
  const auth = requireAuth(req, "admin");
  if (auth instanceof Response) return auth;

  const { scheduleId } = await params;
  const body = await req.json();

  if (body.status !== undefined) {
    return validationError([
      {
        field: "status",
        message:
          "Field 'status' cannot be updated via PUT. Use PATCH /admin/schedules/:id with { status: 'CANCELLED' } instead.",
      },
    ]);
  }

  const existing = await prisma.tourSchedule.findUnique({
    where: { id: scheduleId },
  });
  if (!existing) return notFound("Schedule not found");

  const schedule = await prisma.tourSchedule.update({
    where: { id: scheduleId },
    data: {
      ...(body.startDateTime && {
        startDateTime: new Date(body.startDateTime),
      }),
      ...(body.endDateTime && { endDateTime: new Date(body.endDateTime) }),
      ...(body.capacity !== undefined && { capacity: Number(body.capacity) }),
    },
  });

  return jsonOk(schedule);
}

// PATCH /api/v1/admin/schedules/:scheduleId
// Status update only. Currently only `{ status: "CANCELLED" }` is accepted.
// Refuses to cancel a schedule that still has non-cancelled bookings (409).
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ scheduleId: string }> }
) {
  const auth = requireAuth(req, "admin");
  if (auth instanceof Response) return auth;

  const { scheduleId } = await params;
  const body = await req.json();

  if (body.status !== "CANCELLED") {
    return validationError([
      {
        field: "status",
        message: "only status='CANCELLED' is supported via PATCH",
      },
    ]);
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.tourSchedule.findUnique({
        where: { id: scheduleId },
      });
      if (!existing) return { kind: "not_found" as const };

      const activeCount = await tx.booking.count({
        where: {
          tourScheduleId: scheduleId,
          status: { not: "CANCELLED" },
        },
      });
      if (activeCount > 0) {
        return { kind: "conflict" as const, activeCount };
      }

      await tx.tourSchedule.update({
        where: { id: scheduleId },
        data: { status: "CANCELLED" },
      });

      const fresh = await tx.tourSchedule.findUnique({
        where: { id: scheduleId },
        include: scheduleSummaryInclude,
      });
      return { kind: "ok" as const, schedule: fresh! };
    });

    if (updated.kind === "not_found") return notFound("Schedule not found");
    if (updated.kind === "conflict") {
      return jsonError(
        "CONFLICT",
        `Cannot cancel schedule with ${updated.activeCount} active booking(s)`,
        409
      );
    }
    return jsonOk(summarizeSchedule(updated.schedule));
  } catch (err) {
    throw err;
  }
}

// DELETE /api/v1/admin/schedules/:scheduleId
// Removed: hard delete is unsafe (orphan bookings) and logical cancellation is
// handled by PATCH. Always returns 410 Gone.
export async function DELETE(
  req: NextRequest,
  _ctx: { params: Promise<{ scheduleId: string }> }
) {
  const auth = requireAuth(req, "admin");
  if (auth instanceof Response) return auth;

  return jsonError(
    "GONE",
    "This endpoint is removed. Use PATCH /admin/schedules/:id with { status: 'CANCELLED' } instead.",
    410
  );
}
