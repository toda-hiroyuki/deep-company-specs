import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonOk, jsonError } from "@/lib/response";

export async function GET(req: NextRequest) {
  const auth = requireAuth(req, "guest");
  if (auth instanceof Response) return auth;

  const guest = await prisma.guest.findUnique({
    where: { id: auth.id },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      nationality: true,
      language: true,
      createdAt: true,
    },
  });

  // JWT signature is valid but the Guest row no longer exists (deleted, or DB
  // reseeded with a stale token still in localStorage). Return 401 so the
  // client's guestFetch auto-logs-out and redirects to login.
  if (!guest) {
    return jsonError("UNAUTHORIZED", "Session is no longer valid", 401);
  }

  return jsonOk({ guest });
}

export async function PUT(req: NextRequest) {
  const auth = requireAuth(req, "guest");
  if (auth instanceof Response) return auth;

  const body = await req.json();
  const { firstName, lastName, nationality, language } = body;

  const data: Record<string, string> = {};
  if (firstName?.trim()) data.firstName = firstName.trim();
  if (lastName?.trim()) data.lastName = lastName.trim();
  if (nationality !== undefined) data.nationality = nationality;
  if (language !== undefined) data.language = language;

  // Same session-integrity check as GET: bail with 401 instead of letting the
  // update throw a P2025 ("record not found") that surfaces as a generic 500.
  const exists = await prisma.guest.findUnique({
    where: { id: auth.id },
    select: { id: true },
  });
  if (!exists) {
    return jsonError("UNAUTHORIZED", "Session is no longer valid", 401);
  }

  const guest = await prisma.guest.update({
    where: { id: auth.id },
    data,
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      nationality: true,
      language: true,
    },
  });

  return jsonOk({ guest });
}
