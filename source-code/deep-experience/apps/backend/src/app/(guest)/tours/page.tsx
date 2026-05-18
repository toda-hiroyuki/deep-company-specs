"use client";

import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { apiFetch } from "../lib/api";
import { useI18n } from "@/lib/i18n";
import TourCard from "../components/TourCard";

interface TourItem {
  id: string;
  title: string;
  category: string;
  tourType: string;
  imageUrl: string | null;
  pricePerPersonCents: number;
  durationMinutes: number;
  meetingPoint: { name: string };
  nextSchedule: {
    startDateTime: string;
    remainingSlots: number;
  } | null;
  distanceKm: number;
}

export default function ToursPage() {
  const { t, locale } = useI18n();
  const [tours, setTours] = useState<TourItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiFetch<{ tours: TourItem[] }>(
      `/tours/search?lat=35.6812&lng=139.7671&radiusKm=50&lang=${locale}`
    )
      .then((data) => setTours(data.tours))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [locale]);

  return (
    <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900">
          {t("guest.tours.allTours")}
        </h1>
        <p className="text-gray-500 mt-2">
          {t("guest.tours.allToursSubtitle")}
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-red-200 border-t-red-700 rounded-full animate-spin" />
        </div>
      ) : tours.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <MapPin className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-lg">{t("guest.tours.noTours")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {tours.map((tour) => (
            <TourCard
              key={tour.id}
              id={tour.id}
              title={tour.title}
              category={tour.category}
              tourType={tour.tourType}
              imageUrl={tour.imageUrl}
              meetingPointName={tour.meetingPoint.name}
              pricePerPersonCents={tour.pricePerPersonCents}
              durationMinutes={tour.durationMinutes}
              nextSchedule={tour.nextSchedule}
              distanceKm={tour.distanceKm}
            />
          ))}
        </div>
      )}
    </div>
  );
}
