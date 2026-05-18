import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonOk } from "@/lib/response";

// GET /api/v1/admin/media?page=1&limit=20&search=
export async function GET(req: NextRequest) {
  const auth = requireAuth(req, "admin");
  if (auth instanceof Response) return auth;

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
  const search = searchParams.get("search") || "";

  const where = search
    ? { OR: [
        { filename: { contains: search } },
        { alt: { contains: search } },
      ] }
    : {};

  const [media, total] = await Promise.all([
    prisma.media.findMany({
      where,
      include: {
        _count: { select: { tourMedia: true, spotMedia: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.media.count({ where }),
  ]);

  return jsonOk({
    media: media.map((m) => ({
      ...m,
      tourCount: m._count.tourMedia,
      spotCount: m._count.spotMedia,
      _count: undefined,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}
