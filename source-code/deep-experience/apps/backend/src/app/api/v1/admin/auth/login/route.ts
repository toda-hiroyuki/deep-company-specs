import { NextRequest } from "next/server";
import { compareSync } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/auth";
import { jsonOk, jsonError } from "@/lib/response";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { email, password } = body;

  if (!email || !password) {
    return jsonError("VALIDATION_ERROR", "Email and password are required", 400);
  }

  const admin = await prisma.admin.findUnique({ where: { email } });
  if (!admin || !compareSync(password, admin.passwordHash)) {
    return jsonError("UNAUTHORIZED", "Invalid email or password", 401);
  }

  const token = signToken({ id: admin.id, email: admin.email, role: "admin" });

  return jsonOk({
    token,
    admin: { id: admin.id, name: admin.name, email: admin.email },
  });
}
