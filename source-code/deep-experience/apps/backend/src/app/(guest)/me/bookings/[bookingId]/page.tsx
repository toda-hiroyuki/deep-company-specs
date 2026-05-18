"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  MapPin,
  Calendar,
  Users,
  CreditCard,
  User,
  MessageSquare,
  Clock,
  ExternalLink,
} from "lucide-react";
import { useGuestAuth } from "@/lib/guest-auth";
import { useI18n } from "@/lib/i18n";
import { formatScheduleLong } from "@/lib/date-format";
import StatusBadge from "../../../components/StatusBadge";

interface BookingDetail {
  id: string;
  status: string;
  travelerName: string;
  numberOfGuests: number;
  specialRequests: string | null;
  totalPriceCents: number;
  createdAt: string;
  tour: {
    id: string;
    title: string;
    imageUrl: string | null;
    category: string;
    tourType: string;
    durationMinutes: number;
    maxParticipants: number;
  };
  schedule: {
    startDateTime: string;
    endDateTime: string;
    meetingPoint: { lat: number; lng: number; name: string };
  };
  guide: { name: string; profileImageUrl: string | null } | null;
}

export default function MyBookingDetailPage() {
  const params = useParams();
  const bookingId = params.bookingId as string;
  const { t, locale } = useI18n();
  const { guestFetch, isLoggedIn, loading: authLoading } = useGuestAuth();

  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const loadBooking = useCallback(async () => {
    try {
      const data = await guestFetch(`/bookings/${bookingId}?lang=${locale}`);
      setBooking(data as BookingDetail);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load booking");
    } finally {
      setLoading(false);
    }
  }, [bookingId, guestFetch, locale]);

  useEffect(() => {
    if (authLoading || !isLoggedIn) return;
    loadBooking();
  }, [authLoading, isLoggedIn, loadBooking]);

  async function handleCancel() {
    if (!confirm(t("guest.bookings.confirmCancel"))) return;
    setCancelling(true);
    try {
      await guestFetch(`/bookings/${bookingId}/cancel`, { method: "POST" });
      loadBooking();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Cancel failed");
    } finally {
      setCancelling(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-red-200 border-t-red-700 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{error || "Booking not found"}</p>
        <Link
          href="/me/bookings"
          className="text-red-700 hover:underline mt-4 inline-block"
        >
          {t("guest.bookings.backToBookings")}
        </Link>
      </div>
    );
  }

  const canCancel = ["PENDING", "CONFIRMED"].includes(booking.status);

  const STATUS_BANNER_COLORS: Record<string, string> = {
    PENDING: "bg-amber-500",
    CONFIRMED: "bg-green-600",
    CANCELLED: "bg-red-600",
    IN_PROGRESS: "bg-blue-600",
    COMPLETED: "bg-gray-600",
    EXPIRED: "bg-gray-400",
  };

  return (
    <div>
      <Link
        href="/me/bookings"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
      >
        <ChevronLeft className="w-4 h-4" />
        {t("guest.bookings.backToBookings")}
      </Link>

      <div
        className={`${
          STATUS_BANNER_COLORS[booking.status] || "bg-gray-500"
        } text-white rounded-t-xl p-4 text-center`}
      >
        <StatusBadge status={booking.status} />
      </div>

      <div className="bg-white rounded-b-xl shadow-sm border border-gray-200 border-t-0 overflow-hidden">
        {/* Hero image */}
        {booking.tour.imageUrl && (
          <div className="relative w-full h-56 md:h-72 bg-gray-100">
            <img
              src={booking.tour.imageUrl}
              alt={booking.tour.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="p-6 md:p-8">
          {/* Title — links to public tour detail */}
          <Link
            href={`/tours/${booking.tour.id}`}
            className="group inline-flex items-baseline gap-2 hover:underline"
          >
            <h1 className="text-2xl font-bold text-gray-900 group-hover:text-red-700 transition-colors">
              {booking.tour.title}
            </h1>
            <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-red-700 transition-colors shrink-0" />
          </Link>

          {/* Info chips: category / tour type / duration / max guests / meeting point */}
          <div className="mt-3 mb-6 flex flex-wrap gap-2">
            <span className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
              {booking.tour.category}
            </span>
            <span className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
              {booking.tour.tourType === "PRIVATE"
                ? t("guest.tourDetail.privateTour")
                : t("guest.tourDetail.groupTour")}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
              <Clock className="w-3 h-3" />
              {t("guest.tourDetail.minutes", { count: booking.tour.durationMinutes })}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
              <Users className="w-3 h-3" />
              {t("guest.tourDetail.maxGuests", { count: booking.tour.maxParticipants })}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
              <MapPin className="w-3 h-3" />
              {booking.schedule.meetingPoint.name}
            </span>
          </div>

          {/* Booking-specific details */}
          <div className="space-y-5 pt-5 border-t border-gray-100">
            <InfoRow icon={Calendar} label={t("guest.bookings.schedule")}>
              {formatScheduleLong(booking.schedule.startDateTime, locale)}
            </InfoRow>

            <InfoRow icon={MapPin} label={t("guest.tourDetail.meetingPoint")}>
              {booking.schedule.meetingPoint.name}
            </InfoRow>

            <InfoRow icon={Users} label={t("guest.bookings.guests")}>
              {t("guest.bookings.guestCount", { count: booking.numberOfGuests })}
            </InfoRow>

            <InfoRow icon={CreditCard} label={t("guest.bookings.totalPayOnSite")}>
              <span className="text-lg font-bold text-red-700">
                ${(booking.totalPriceCents / 100).toFixed(2)}
              </span>
            </InfoRow>

            {booking.guide && (
              <InfoRow icon={User} label={t("guest.bookings.yourGuide")}>
                {booking.guide.name}
              </InfoRow>
            )}

            {booking.specialRequests && (
              <InfoRow
                icon={MessageSquare}
                label={t("guest.tourDetail.specialRequests")}
              >
                {booking.specialRequests}
              </InfoRow>
            )}
          </div>
        </div>

        {canCancel && (
          <div className="border-t border-gray-100 p-6">
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="w-full py-3 border-2 border-red-300 text-red-600 font-semibold rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
            >
              {cancelling
                ? t("guest.bookings.cancelling")
                : t("guest.bookings.cancelBooking")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">
          {label}
        </p>
        <div className="text-gray-900 mt-0.5">{children}</div>
      </div>
    </div>
  );
}
