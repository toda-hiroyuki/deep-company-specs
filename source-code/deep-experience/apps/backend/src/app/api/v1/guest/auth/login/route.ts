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

  const guest = await prisma.guest.findUnique({ where: { email: email.trim() } });
  if (!guest || !compareSync(password, guest.passwordHash)) {
    return jsonError("UNAUTHORIZED", "Invalid email or password", 401);
  }

  const token = signToken({ id: guest.id, email: guest.email, role: "guest" });

  return jsonOk({
    token,
    guest: {
      id: guest.id,
      email: guest.email,
      firstName: guest.firstName,
      lastName: guest.lastName,
    },
  });
}
