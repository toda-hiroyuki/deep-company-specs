import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonOk, notFound, validationError, jsonError } from "@/lib/response";

// GET /api/v1/admin/tours/:tourId/capacity-rules
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tourId: string }> }
) {
  const auth = requireAuth(req, "admin");
  if (auth instanceof Response) return auth;

  const { tourId } = await params;
  const rules = await prisma.capacityRule.findMany({
    where: { tourId },
    orderBy: { priority: "desc" },
  });

  return jsonOk({
    capacityRules: rules.map((r) => ({
      ...r,
      daysOfWeek: JSON.parse(r.daysOfWeek),
      startTimes: JSON.parse(r.startTimes),
    })),
  });
}

// POST /api/v1/admin/tours/:tourId/capacity-rules
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tourId: string }> }
) {
  const auth = requireAuth(req, "admin");
  if (auth instanceof Response) return auth;

  const { tourId } = await params;
  const tour = await prisma.tour.findUnique({ where: { id: tourId } });
  if (!tour) return notFound("Tour not found");

  const body = await req.json();
  const errors: { field: string; message: string }[] = [];
  if (!body.ruleType) errors.push({ field: "ruleType", message: "required" });
  if (!body.startTimes || !Array.isArray(body.startTimes))
    errors.push({ field: "startTimes", message: "required array" });
  if (body.capacity == null || body.capacity < 1)
    errors.push({ field: "capacity", message: "must be at least 1" });
  if (errors.length > 0) return validationError(errors);

  const validTypes = ["WEEKLY", "YEARLY", "RANGE", "SINGLE"];
  if (!validTypes.includes(body.ruleType)) {
    return jsonError("VALIDATION_ERROR", `ruleType must be one of: ${validTypes.join(", ")}`, 400);
  }

  const rule = await prisma.capacityRule.create({
    data: {
      tourId,
      ruleType: body.ruleType,
      daysOfWeek: JSON.stringify(body.daysOfWeek || []),
      startDate: body.startDate ? new Date(body.startDate) : null,
      endDate: body.endDate ? new Date(body.endDate) : null,
      singleDate: body.singleDate ? new Date(body.singleDate) : null,
      startTimes: JSON.stringify(body.startTimes),
      capacity: body.capacity,
      minParticipants: body.minParticipants ?? 1,
      maxPerBooking: body.maxPerBooking ?? null,
      minPerBooking: body.minPerBooking ?? 1,
      priority: body.priority ?? 0,
    },
  });

  return jsonOk(
    {
      ...rule,
      daysOfWeek: JSON.parse(rule.daysOfWeek),
      startTimes: JSON.parse(rule.startTimes),
    },
    201
  );
}

// DELETE /api/v1/admin/tours/:tourId/capacity-rules (delete by id in body)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ tourId: string }> }
) {
  const auth = requireAuth(req, "admin");
  if (auth instanceof Response) return auth;

  const { tourId } = await params;
  const body = await req.json();

  if (!body.id) {
    return validationError([{ field: "id", message: "required" }]);
  }

  const rule = await prisma.capacityRule.findFirst({
    where: { id: body.id, tourId },
  });
  if (!rule) return notFound("Capacity rule not found");

  await prisma.capacityRule.delete({ where: { id: body.id } });

  return jsonOk({ id: body.id, deleted: true });
}
