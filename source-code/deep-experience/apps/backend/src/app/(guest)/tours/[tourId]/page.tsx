"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { MapPin, Clock, Users, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { apiFetch } from "../../lib/api";
import { useI18n } from "@/lib/i18n";
import { useGuestAuth } from "@/lib/guest-auth";
import { formatScheduleShort } from "@/lib/date-format";
import { localizeApiError } from "@/lib/api-error";
import MapView from "../../components/MapView";
import FavoriteButton from "../../components/FavoriteButton";

interface GalleryImage {
  id: string;
  url: string;
  thumbnailUrl: string;
  alt: string;
}

interface TourDetail {
  id: string;
  title: string;
  description: string;
  category: string;
  tourType: string;
  meetingPoint: { lat: number; lng: number; name: string };
  durationMinutes: number;
  pricePerPersonCents: number;
  maxParticipants: number;
  imageUrls: string[]; // cover / hero
  gallery: GalleryImage[];
}

interface Schedule {
  id: string;
  startDateTime: string;
  endDateTime: string;
  remainingSlots: number;
  status: string;
}

export default function TourDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tourId = params.tourId as string;

  const [tour, setTour] = useState<TourDetail | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Booking form state
  const [selectedSchedule, setSelectedSchedule] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [guests, setGuests] = useState(1);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const { t, locale } = useI18n();
  const { guest, isLoggedIn, guestFetch, loading: authLoading } = useGuestAuth();

  // Refetch on locale change so title/description switch language without reload.
  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiFetch<TourDetail>(`/tours/${tourId}?lang=${locale}`),
      apiFetch<{ schedules: Schedule[] }>(`/tours/${tourId}/schedules`),
    ])
      .then(([tourData, schedData]) => {
        setTour(tourData);
        setSchedules(schedData.schedules.filter((s) => s.status === "OPEN"));
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [tourId, locale]);

  // Prefill name/email from logged-in guest, without clobbering edits
  useEffect(() => {
    if (authLoading || !guest) return;
    setName((prev) =>
      prev ? prev : `${guest.firstName ?? ""} ${guest.lastName ?? ""}`.trim()
    );
    setEmail((prev) => (prev ? prev : guest.email ?? ""));
  }, [authLoading, guest]);

  async function handleBook() {
    if (!selectedSchedule || !name.trim() || !email.trim()) {
      setBookingError(t("guest.tourDetail.fillRequired"));
      return;
    }
    const chosen = schedules.find((s) => s.id === selectedSchedule);
    if (!chosen) {
      setBookingError(t("guest.tourDetail.fillRequired"));
      return;
    }
    // Booking detail/cancel flows are auth-gated under /me — make booking itself
    // a logged-in feature too. Anonymous bookings would attach guestId=null and
    // become unviewable post-creation.
    if (!isLoggedIn) {
      router.push(
        `/auth/login?next=${encodeURIComponent(window.location.pathname)}`
      );
      return;
    }
    setSubmitting(true);
    setBookingError(null);
    try {
      // Use guestFetch so the JWT is attached → server sets guestId on the
      // booking → ownership check passes on the detail page redirect.
      const result = (await guestFetch("/bookings", {
        method: "POST",
        body: JSON.stringify({
          tourId,
          requestedStartDateTime: chosen.startDateTime,
          travelerName: name.trim(),
          travelerEmail: email.trim(),
          numberOfGuests: guests,
          specialRequests: note.trim() || undefined,
        }),
      })) as { id: string };
      router.push(`/me/bookings/${result.id}`);
    } catch (e: unknown) {
      setBookingError(
        localizeApiError(
          e,
          "guest.bookingErrors",
          t,
          t("guest.tourDetail.bookingFailed")
        )
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-red-200 border-t-red-700 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !tour) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center">
        <p className="text-red-600">{error || "Tour not found"}</p>
        <Link href="/" className="text-red-700 hover:underline mt-4 inline-block">
          Back to home
        </Link>
      </div>
    );
  }

  const selectedSched = schedules.find((s) => s.id === selectedSchedule);

  return (
    <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-10">
      {/* Back link */}
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
      >
        <ChevronLeft className="w-4 h-4" />
        {t("guest.tours.backToTours")}
      </Link>

      <div className="lg:grid lg:grid-cols-3 lg:gap-12">
        {/* Left Column - Tour Info */}
        <div className="lg:col-span-2">
          {/* Hero Image */}
          {tour.imageUrls?.[0] && (
            <div className="rounded-xl overflow-hidden mb-6">
              <img
                src={tour.imageUrls[0]}
                alt={tour.title}
                className="w-full h-64 md:h-96 object-cover"
              />
            </div>
          )}

          <div className="flex items-start justify-between gap-3 mb-3">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              {tour.title}
            </h1>
            <FavoriteButton tourId={tour.id} variant="inline" />
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded-full">
              {tour.category}
            </span>
            <span className="px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded-full">
              {tour.tourType === "PRIVATE" ? t("guest.tourDetail.privateTour") : t("guest.tourDetail.groupTour")}
            </span>
          </div>

          {/* Quick Info */}
          <div className="flex flex-wrap gap-6 mb-6 text-gray-600">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-gray-400" />
              <span>{t("guest.tourDetail.minutes", { count: tour.durationMinutes })}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-gray-400" />
              <span>{t("guest.tourDetail.maxGuests", { count: tour.maxParticipants })}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-gray-400" />
              <span>{tour.meetingPoint.name}</span>
            </div>
          </div>

          {/* Price */}
          <div className="text-2xl font-bold text-red-700 mb-6">
            ${(tour.pricePerPersonCents / 100).toFixed(2)}{" "}
            <span className="text-base font-normal text-gray-500">
              {t("perPerson")}
            </span>
          </div>

          {/* Description */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              {t("guest.tourDetail.aboutThisTour")}
            </h2>
            <p className="text-gray-600 leading-relaxed whitespace-pre-line">
              {tour.description}
            </p>
          </div>

          {/* Gallery */}
          {tour.gallery && tour.gallery.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                {t("guest.tourDetail.gallery")}
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {tour.gallery.map((img) => (
                  <a
                    key={img.id}
                    href={img.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="aspect-square overflow-hidden rounded-lg bg-gray-100 group"
                  >
                    <img
                      src={img.thumbnailUrl}
                      alt={img.alt}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Meeting Point Map */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              {t("guest.tourDetail.meetingPoint")}
            </h2>
            <p className="text-gray-600 mb-3 flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {tour.meetingPoint.name}
            </p>
            <MapView
              center={{
                lat: tour.meetingPoint.lat,
                lng: tour.meetingPoint.lng,
              }}
              pins={[
                {
                  id: tour.id,
                  lat: tour.meetingPoint.lat,
                  lng: tour.meetingPoint.lng,
                  title: tour.meetingPoint.name,
                  color: "#c62828",
                  detail: "Meeting point",
                },
              ]}
              height="250px"
              interactive={false}
            />
          </div>
        </div>

        {/* Right Column - Booking */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:sticky lg:top-24">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {t("guest.tourDetail.bookThisTour")}
            </h2>

            {/* Schedule Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("guest.tourDetail.selectTime")}
              </label>
              {schedules.length === 0 ? (
                <p className="text-sm text-gray-500">
                  {t("guest.tourDetail.noAvailableTimes")}
                </p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {schedules.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedSchedule(s.id)}
                      className={`w-full flex flex-col items-start gap-0.5 p-3 rounded-lg border text-sm text-left transition-colors ${
                        selectedSchedule === s.id
                          ? "border-red-700 bg-red-50 text-red-700"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <span className="font-medium">
                        {formatScheduleShort(s.startDateTime, locale)}
                      </span>
                      <span className="text-green-600 text-xs">
                        {t("guest.tours.spotsLeft", { count: s.remainingSlots })}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Booking Form */}
            {selectedSchedule && (
              <>
                {/* Guests */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t("guest.tourDetail.numberOfGuests")}
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setGuests(Math.max(1, guests - 1))}
                      className="w-9 h-9 rounded-full border border-gray-300 flex items-center justify-center text-lg hover:bg-gray-50"
                    >
                      -
                    </button>
                    <span className="text-lg font-semibold w-8 text-center">
                      {guests}
                    </span>
                    <button
                      onClick={() => setGuests(guests + 1)}
                      className="w-9 h-9 rounded-full border border-gray-300 flex items-center justify-center text-lg hover:bg-gray-50"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Name */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("guest.tourDetail.fullName")} *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Smith"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>

                {/* Email */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("guest.tourDetail.email")} *
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="john@example.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>

                {/* Special Requests */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("guest.tourDetail.specialRequests")}
                  </label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Any special requirements..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                  />
                </div>

                {/* Total */}
                <div className="flex justify-between items-center py-3 border-t border-gray-100 mb-4">
                  <span className="text-gray-600">{t("guest.tourDetail.total")}</span>
                  <span className="text-xl font-bold text-gray-900">
                    $
                    {((tour.pricePerPersonCents * guests) / 100).toFixed(2)}
                  </span>
                </div>

                {bookingError && (
                  <p className="text-sm text-red-600 mb-3">{bookingError}</p>
                )}

                {/* Submit */}
                <button
                  onClick={handleBook}
                  disabled={submitting}
                  className="w-full py-3 bg-red-700 text-white font-semibold rounded-lg hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? t("guest.tourDetail.booking") : t("guest.tourDetail.requestBooking")}
                </button>

                <p className="text-xs text-gray-500 text-center mt-3">
                  {t("guest.tourDetail.payOnSite")}
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
