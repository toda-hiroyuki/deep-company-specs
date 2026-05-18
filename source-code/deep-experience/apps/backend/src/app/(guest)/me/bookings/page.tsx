"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Calendar, MapPin, Users, ExternalLink } from "lucide-react";
import { useGuestAuth } from "@/lib/guest-auth";
import { useI18n } from "@/lib/i18n";
import { formatScheduleShort } from "@/lib/date-format";
import StatusBadge from "../../components/StatusBadge";

interface BookingItem {
  id: string;
  status: string;
  numberOfGuests: number;
  tour: { id: string; title: string; imageUrl: string | null };
  schedule: { startDateTime: string; meetingPointName: string };
}

export default function MyBookingsPage() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const { guestFetch, isLoggedIn, loading: authLoading } = useGuestAuth();
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !isLoggedIn) return;
    setLoading(true);
    guestFetch(`/bookings?lang=${locale}`)
      .then((data: { bookings: BookingItem[] }) => setBookings(data.bookings))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [authLoading, isLoggedIn, guestFetch, locale]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-red-200 border-t-red-700 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <section>
      <h2 className="text-xl font-semibold text-gray-900 mb-6">
        {t("guest.bookings.myBookings")}
      </h2>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6 text-sm">
          {error}
        </div>
      )}

      {!error && bookings.length === 0 && (
        <div className="text-center py-12 text-gray-500 bg-white rounded-xl border border-gray-200">
          <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-lg">{t("guest.bookings.noBookingsFound")}</p>
          <p className="text-sm mt-1">{t("guest.me.bookings.exploreHint")}</p>
          <Link
            href="/tours"
            className="inline-block mt-4 px-5 py-2 bg-red-700 !text-white text-sm font-semibold rounded-lg hover:bg-red-800 transition-colors"
          >
            {t("guest.nav.tours")}
          </Link>
        </div>
      )}

      <div className="space-y-4">
        {bookings.map((booking) => (
          // Whole card → booking detail. Tour title is a separate Link to the
          // public tour page (we can't nest <Link>, so the outer is a div with
          // role=button and the inner anchor stopsPropagation).
          <div
            key={booking.id}
            role="button"
            tabIndex={0}
            onClick={() => router.push(`/me/bookings/${booking.id}`)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                router.push(`/me/bookings/${booking.id}`);
              }
            }}
            className="block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex">
              {/* Cover image */}
              {booking.tour.imageUrl ? (
                <div className="w-32 sm:w-44 shrink-0 bg-gray-100">
                  <img
                    src={booking.tour.imageUrl}
                    alt={booking.tour.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-32 sm:w-44 shrink-0 bg-gray-100 flex items-center justify-center">
                  <MapPin className="w-8 h-8 text-gray-300" />
                </div>
              )}

              {/* Body */}
              <div className="flex-1 min-w-0 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/tours/${booking.tour.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="group inline-flex items-baseline gap-1 hover:underline"
                    >
                      <h3 className="font-semibold text-gray-900 truncate group-hover:text-red-700 transition-colors">
                        {booking.tour.title}
                      </h3>
                      <ExternalLink className="w-3.5 h-3.5 text-gray-400 group-hover:text-red-700 transition-colors shrink-0" />
                    </Link>
                    <div className="mt-2.5 space-y-1.5">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Calendar className="w-4 h-4 shrink-0" />
                        <span className="truncate">
                          {formatScheduleShort(booking.schedule.startDateTime, locale)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <MapPin className="w-4 h-4 shrink-0" />
                        <span className="truncate">
                          {booking.schedule.meetingPointName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Users className="w-4 h-4 shrink-0" />
                        <span>
                          {t("guest.bookings.guestCount", {
                            count: booking.numberOfGuests,
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <StatusBadge status={booking.status} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
