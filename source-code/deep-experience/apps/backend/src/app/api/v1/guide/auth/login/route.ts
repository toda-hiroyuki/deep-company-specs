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

  const guide = await prisma.guide.findUnique({ where: { email } });
  if (!guide || !compareSync(password, guide.passwordHash)) {
    return jsonError("UNAUTHORIZED", "Invalid email or password", 401);
  }

  const token = signToken({ id: guide.id, email: guide.email, role: "guide" });

  return jsonOk({
    token,
    guide: { id: guide.id, name: guide.name, email: guide.email },
  });
}
