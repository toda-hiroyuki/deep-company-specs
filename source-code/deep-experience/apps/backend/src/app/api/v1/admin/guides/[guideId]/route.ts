import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonOk, notFound } from "@/lib/response";

// GET /api/v1/admin/guides/:guideId
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ guideId: string }> }
) {
  const auth = requireAuth(req, "admin");
  if (auth instanceof Response) return auth;

  const { guideId } = await params;
  const guide = await prisma.guide.findUnique({
    where: { id: guideId },
    include: {
      assignments: {
        include: {
          booking: {
            include: { tourSchedule: { include: { tour: true } } },
          },
        },
        orderBy: { assignedAt: "desc" },
        take: 20,
      },
    },
  });

  if (!guide) return notFound("Guide not found");

  return jsonOk({
    ...guide,
    passwordHash: undefined,
    languages: JSON.parse(guide.languages),
    areas: JSON.parse(guide.areas),
  });
}

// PUT /api/v1/admin/guides/:guideId
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ guideId: string }> }
) {
  const auth = requireAuth(req, "admin");
  if (auth instanceof Response) return auth;

  const { guideId } = await params;
  const body = await req.json();

  const existing = await prisma.guide.findUnique({ where: { id: guideId } });
  if (!existing) return notFound("Guide not found");

  const guide = await prisma.guide.update({
    where: { id: guideId },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.bio !== undefined && { bio: body.bio }),
      ...(body.languages !== undefined && {
        languages: JSON.stringify(body.languages),
      }),
      ...(body.areas !== undefined && { areas: JSON.stringify(body.areas) }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
    },
  });

  return jsonOk({
    ...guide,
    passwordHash: undefined,
    languages: JSON.parse(guide.languages),
    areas: JSON.parse(guide.areas),
  });
}
