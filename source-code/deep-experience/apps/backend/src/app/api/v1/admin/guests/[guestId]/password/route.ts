import { NextRequest } from "next/server";
import { hashSync } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonOk, notFound, validationError } from "@/lib/response";

// PUT /api/v1/admin/guests/:guestId/password - reset a guest's password (admin only)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ guestId: string }> }
) {
  const auth = requireAuth(req, "admin");
  if (auth instanceof Response) return auth;

  const { guestId } = await params;
  const body = await req.json();
  const { newPassword } = body ?? {};

  const errors: { field: string; message: string }[] = [];
  if (!newPassword) errors.push({ field: "newPassword", message: "New password is required" });
  else if (newPassword.length < 8) errors.push({ field: "newPassword", message: "Password must be at least 8 characters" });
  if (errors.length > 0) return validationError(errors);

  const existing = await prisma.guest.findUnique({ where: { id: guestId }, select: { id: true } });
  if (!existing) return notFound("Guest not found");

  await prisma.guest.update({
    where: { id: guestId },
    data: { passwordHash: hashSync(newPassword, 10) },
  });

  return jsonOk({ ok: true });
}
