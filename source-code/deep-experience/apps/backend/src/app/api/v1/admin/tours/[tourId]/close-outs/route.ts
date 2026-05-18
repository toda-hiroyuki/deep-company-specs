import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonOk, notFound, validationError } from "@/lib/response";

// GET /api/v1/admin/tours/:tourId/close-outs
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tourId: string }> }
) {
  const auth = requireAuth(req, "admin");
  if (auth instanceof Response) return auth;

  const { tourId } = await params;
  const closeOuts = await prisma.closeOut.findMany({
    where: { tourId },
    orderBy: { date: "asc" },
  });

  return jsonOk({
    closeOuts: closeOuts.map((c) => ({
      ...c,
      startTime: c.startTime ? JSON.parse(c.startTime) : null,
    })),
  });
}

// POST /api/v1/admin/tours/:tourId/close-outs
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
  if (!body.date) {
    return validationError([{ field: "date", message: "required" }]);
  }

  const closeOut = await prisma.closeOut.create({
    data: {
      tourId,
      date: new Date(body.date),
      startTime: body.startTime ? JSON.stringify(body.startTime) : null,
      reason: body.reason || null,
    },
  });

  return jsonOk(
    {
      ...closeOut,
      startTime: closeOut.startTime ? JSON.parse(closeOut.startTime) : null,
    },
    201
  );
}

// DELETE /api/v1/admin/tours/:tourId/close-outs
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

  const closeOut = await prisma.closeOut.findFirst({
    where: { id: body.id, tourId },
  });
  if (!closeOut) return notFound("Close-out not found");

  await prisma.closeOut.delete({ where: { id: body.id } });

  return jsonOk({ id: body.id, deleted: true });
}
