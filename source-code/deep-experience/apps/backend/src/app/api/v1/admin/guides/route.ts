import { NextRequest } from "next/server";
import { hashSync } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonOk, validationError } from "@/lib/response";

// GET /api/v1/admin/guides
export async function GET(req: NextRequest) {
  const auth = requireAuth(req, "admin");
  if (auth instanceof Response) return auth;

  const guides = await prisma.guide.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      profileImageUrl: true,
      languages: true,
      areas: true,
      isActive: true,
      createdAt: true,
    },
  });

  return jsonOk({
    guides: guides.map((g) => ({
      ...g,
      languages: JSON.parse(g.languages),
      areas: JSON.parse(g.areas),
    })),
  });
}

// POST /api/v1/admin/guides
export async function POST(req: NextRequest) {
  const auth = requireAuth(req, "admin");
  if (auth instanceof Response) return auth;

  const body = await req.json();

  const errors: { field: string; message: string }[] = [];
  if (!body.email) errors.push({ field: "email", message: "required" });
  if (!body.password) errors.push({ field: "password", message: "required" });
  if (!body.name) errors.push({ field: "name", message: "required" });
  if (errors.length > 0) return validationError(errors);

  const existing = await prisma.guide.findUnique({
    where: { email: body.email },
  });
  if (existing) {
    return validationError([
      { field: "email", message: "Email already registered" },
    ]);
  }

  const guide = await prisma.guide.create({
    data: {
      email: body.email,
      passwordHash: hashSync(body.password, 10),
      name: body.name,
      bio: body.bio || null,
      languages: JSON.stringify(body.languages || []),
      areas: JSON.stringify(body.areas || []),
    },
  });

  return jsonOk(
    {
      id: guide.id,
      email: guide.email,
      name: guide.name,
      languages: JSON.parse(guide.languages),
      areas: JSON.parse(guide.areas),
    },
    201
  );
}
