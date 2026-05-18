import { NextRequest } from "next/server";
import { hashSync } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonOk, validationError } from "@/lib/response";

// GET /api/v1/admin/admins
export async function GET(req: NextRequest) {
  const auth = requireAuth(req, "admin");
  if (auth instanceof Response) return auth;

  const admins = await prisma.admin.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return jsonOk({ admins });
}

// POST /api/v1/admin/admins
export async function POST(req: NextRequest) {
  const auth = requireAuth(req, "admin");
  if (auth instanceof Response) return auth;

  const body = await req.json();

  const errors: { field: string; message: string }[] = [];
  if (!body.email) errors.push({ field: "email", message: "required" });
  if (!body.password) errors.push({ field: "password", message: "required" });
  if (!body.name) errors.push({ field: "name", message: "required" });
  if (errors.length > 0) return validationError(errors);

  const existing = await prisma.admin.findUnique({
    where: { email: body.email },
  });
  if (existing) {
    return validationError([
      { field: "email", message: "Email already registered" },
    ]);
  }

  const admin = await prisma.admin.create({
    data: {
      email: body.email,
      passwordHash: hashSync(body.password, 10),
      name: body.name,
    },
  });

  return jsonOk(
    {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      createdAt: admin.createdAt,
      updatedAt: admin.updatedAt,
    },
    201
  );
}
