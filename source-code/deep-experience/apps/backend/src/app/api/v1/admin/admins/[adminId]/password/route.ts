import { NextRequest } from "next/server";
import { hashSync } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonOk, notFound, validationError } from "@/lib/response";

// PUT /api/v1/admin/admins/:adminId/password
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ adminId: string }> }
) {
  const auth = requireAuth(req, "admin");
  if (auth instanceof Response) return auth;

  const { adminId } = await params;
  const body = await req.json();

  if (!body.newPassword) {
    return validationError([
      { field: "newPassword", message: "required" },
    ]);
  }

  const existing = await prisma.admin.findUnique({ where: { id: adminId } });
  if (!existing) return notFound("Admin not found");

  await prisma.admin.update({
    where: { id: adminId },
    data: { passwordHash: hashSync(body.newPassword, 10) },
  });

  return jsonOk({ message: "Password updated" });
}
