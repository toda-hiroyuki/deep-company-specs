import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonOk, jsonError, notFound, validationError } from "@/lib/response";

// GET /api/v1/admin/admins/:adminId
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ adminId: string }> }
) {
  const auth = requireAuth(req, "admin");
  if (auth instanceof Response) return auth;

  const { adminId } = await params;
  const admin = await prisma.admin.findUnique({
    where: { id: adminId },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!admin) return notFound("Admin not found");

  return jsonOk(admin);
}

// PUT /api/v1/admin/admins/:adminId
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ adminId: string }> }
) {
  const auth = requireAuth(req, "admin");
  if (auth instanceof Response) return auth;

  const { adminId } = await params;
  const body = await req.json();

  const existing = await prisma.admin.findUnique({ where: { id: adminId } });
  if (!existing) return notFound("Admin not found");

  // Check email uniqueness if changing email
  if (body.email && body.email !== existing.email) {
    const duplicate = await prisma.admin.findUnique({
      where: { email: body.email },
    });
    if (duplicate) {
      return validationError([
        { field: "email", message: "Email already registered" },
      ]);
    }
  }

  const admin = await prisma.admin.update({
    where: { id: adminId },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.email !== undefined && { email: body.email }),
    },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return jsonOk(admin);
}

// DELETE /api/v1/admin/admins/:adminId
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ adminId: string }> }
) {
  const auth = requireAuth(req, "admin");
  if (auth instanceof Response) return auth;

  const { adminId } = await params;

  // Guard: cannot delete yourself
  if (auth.id === adminId) {
    return jsonError("FORBIDDEN", "Cannot delete yourself", 400);
  }

  // Guard: cannot delete the last admin
  const adminCount = await prisma.admin.count();
  if (adminCount <= 1) {
    return jsonError("FORBIDDEN", "Cannot delete the last administrator", 400);
  }

  const existing = await prisma.admin.findUnique({ where: { id: adminId } });
  if (!existing) return notFound("Admin not found");

  await prisma.admin.delete({ where: { id: adminId } });

  return jsonOk({ message: "Admin deleted" });
}
