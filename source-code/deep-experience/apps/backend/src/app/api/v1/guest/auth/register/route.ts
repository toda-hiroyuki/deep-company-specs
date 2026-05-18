import { NextRequest } from "next/server";
import { hashSync } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/auth";
import { jsonOk, jsonError, validationError } from "@/lib/response";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { email, password, firstName, lastName } = body;

  // Validation
  const errors: { field: string; message: string }[] = [];
  if (!email?.trim()) errors.push({ field: "email", message: "Email is required" });
  if (!password) errors.push({ field: "password", message: "Password is required" });
  else if (password.length < 8) errors.push({ field: "password", message: "Password must be at least 8 characters" });
  if (!firstName?.trim()) errors.push({ field: "firstName", message: "First name is required" });
  if (!lastName?.trim()) errors.push({ field: "lastName", message: "Last name is required" });

  if (errors.length > 0) return validationError(errors);

  // Email format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return validationError([{ field: "email", message: "Invalid email format" }]);
  }

  // Duplicate check
  const existing = await prisma.guest.findUnique({ where: { email: email.trim() } });
  if (existing) {
    return jsonError("CONFLICT", "An account with this email already exists", 409);
  }

  // Create guest
  const passwordHash = hashSync(password, 10);
  const guest = await prisma.guest.create({
    data: {
      email: email.trim(),
      passwordHash,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
    },
  });

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
