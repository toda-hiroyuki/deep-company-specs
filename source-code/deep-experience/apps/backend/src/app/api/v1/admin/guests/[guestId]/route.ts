import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonOk, notFound } from "@/lib/response";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ guestId: string }> }
) {
  const auth = requireAuth(req, "admin");
  if (auth instanceof Response) return auth;

  const { guestId } = await params;

  const guest = await prisma.guest.findUnique({
    where: { id: guestId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      nationality: true,
      language: true,
      isActive: true,
      createdAt: true,
      bookings: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          status: true,
          numberOfGuests: true,
          createdAt: true,
          tourSchedule: {
            select: {
              startDateTime: true,
              tour: { select: { titleEn: true } },
            },
          },
        },
      },
    },
  });

  if (!guest) return notFound("Guest not found");

  return jsonOk({ guest });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ guestId: string }> }
) {
  const auth = requireAuth(req, "admin");
  if (auth instanceof Response) return auth;

  const { guestId } = await params;
  const body = await req.json();

  const data: Record<string, unknown> = {};
  if (body.isActive !== undefined) data.isActive = body.isActive;
  if (body.firstName?.trim()) data.firstName = body.firstName.trim();
  if (body.lastName?.trim()) data.lastName = body.lastName.trim();
  if (body.nationality !== undefined) data.nationality = body.nationality || null;
  if (body.language !== undefined) data.language = body.language || null;

  const guest = await prisma.guest.update({
    where: { id: guestId },
    data,
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      nationality: true,
      language: true,
      isActive: true,
    },
  });

  return jsonOk({ guest });
}
