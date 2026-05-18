import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonOk, notFound } from "@/lib/response";
import { pickLocalized, resolveLocale } from "@/lib/locale";

// GET /api/v1/bookings/:bookingId — guest must own the booking.
// Without ownership enforcement, anyone with a booking ID (which appears in
// shareable URLs and emails) could view another guest's reservation.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  const auth = requireAuth(req, "guest");
  if (auth instanceof Response) return auth;

  const { bookingId } = await params;
  const locale = resolveLocale(req);

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      tourSchedule: { include: { tour: true } },
      assignments: {
        where: { status: "ACCEPTED" },
        include: { guide: true },
        take: 1,
      },
    },
  });

  if (!booking || booking.guestId !== auth.id) {
    // Return NOT_FOUND (not FORBIDDEN) so attackers can't probe ID existence.
    return notFound("Booking not found");
  }

  const tour = booking.tourSchedule.tour;
  const imageUrls = JSON.parse(tour.imageUrls) as string[];
  const acceptedGuide = booking.assignments[0]?.guide || null;

  return jsonOk({
    id: booking.id,
    status: booking.status,
    travelerName: booking.travelerName,
    travelerEmail: booking.travelerEmail,
    numberOfGuests: booking.numberOfGuests,
    specialRequests: booking.specialRequests,
    totalPriceCents: tour.pricePerPersonCents * booking.numberOfGuests,
    currency: "USD",
    createdAt: booking.createdAt.toISOString(),
    tour: {
      id: tour.id,
      title: pickLocalized(locale, tour.title, tour.titleEn),
      imageUrl: imageUrls[0] || null,
      category: tour.category,
      tourType: tour.tourType,
      durationMinutes: tour.durationMinutes,
      maxParticipants: tour.maxParticipants,
      pricePerPersonCents: tour.pricePerPersonCents,
    },
    schedule: {
      id: booking.tourSchedule.id,
      startDateTime: booking.tourSchedule.startDateTime.toISOString(),
      endDateTime: booking.tourSchedule.endDateTime.toISOString(),
      meetingPoint: {
        lat: tour.meetingPointLat,
        lng: tour.meetingPointLng,
        name: tour.meetingPointName,
      },
    },
    guide: acceptedGuide
      ? {
          name: acceptedGuide.name,
          profileImageUrl: acceptedGuide.profileImageUrl,
        }
      : null,
  });
}
