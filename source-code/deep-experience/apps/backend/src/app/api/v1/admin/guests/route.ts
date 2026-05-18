import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonOk } from "@/lib/response";

export async function GET(req: NextRequest) {
  const auth = requireAuth(req, "admin");
  if (auth instanceof Response) return auth;

  const guests = await prisma.guest.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      nationality: true,
      language: true,
      isActive: true,
      createdAt: true,
      _count: { select: { bookings: true } },
    },
  });

  return jsonOk({ guests });
}
