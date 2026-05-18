import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonOk, notFound } from "@/lib/response";

// GET /api/v1/guide/profile
export async function GET(req: NextRequest) {
  const auth = requireAuth(req, "guide");
  if (auth instanceof Response) return auth;

  const guide = await prisma.guide.findUnique({ where: { id: auth.id } });
  if (!guide) return notFound("Guide not found");

  return jsonOk({
    id: guide.id,
    email: guide.email,
    name: guide.name,
    profileImageUrl: guide.profileImageUrl,
    bio: guide.bio,
    languages: JSON.parse(guide.languages),
    areas: JSON.parse(guide.areas),
  });
}

// PUT /api/v1/guide/profile
export async function PUT(req: NextRequest) {
  const auth = requireAuth(req, "guide");
  if (auth instanceof Response) return auth;

  const body = await req.json();

  const guide = await prisma.guide.update({
    where: { id: auth.id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.bio !== undefined && { bio: body.bio }),
      ...(body.languages !== undefined && {
        languages: JSON.stringify(body.languages),
      }),
      ...(body.areas !== undefined && { areas: JSON.stringify(body.areas) }),
    },
  });

  return jsonOk({
    id: guide.id,
    email: guide.email,
    name: guide.name,
    profileImageUrl: guide.profileImageUrl,
    bio: guide.bio,
    languages: JSON.parse(guide.languages),
    areas: JSON.parse(guide.areas),
  });
}
