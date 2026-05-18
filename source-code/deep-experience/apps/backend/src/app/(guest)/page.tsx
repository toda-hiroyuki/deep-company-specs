"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, MapPin } from "lucide-react";
import { apiFetch } from "./lib/api";
import { useI18n } from "@/lib/i18n";
import TourCard from "./components/TourCard";
import MapView from "./components/MapView";

interface TourPin {
  id: string;
  title: string;
  category: string;
  tourType: string;
  imageUrl: string | null;
  meetingPoint: { lat: number; lng: number; name: string };
  pricePerPersonCents: number;
  durationMinutes?: number;
  nextSchedule: {
    id: string;
    startDateTime: string;
    remainingSlots: number;
    status: string;
  } | null;
  distanceKm: number;
}

const PRESETS: Record<string, [number, number]> = {
  "Tokyo Station": [35.6812, 139.7671],
  Asakusa: [35.7112, 139.7963],
  Shibuya: [35.6595, 139.7004],
  Shinjuku: [35.6896, 139.6921],
  Ginza: [35.6717, 139.7649],
  Ueno: [35.7141, 139.7774],
};

const DEFAULT_LAT = 35.6812;
const DEFAULT_LNG = 139.7671;

function getDotColor(tour: TourPin): string {
  if (!tour.nextSchedule) return "#9ca3af";
  if (tour.nextSchedule.status === "FULL") return "#9ca3af";
  if (tour.nextSchedule.remainingSlots <= 2) return "#f97316";
  if (tour.tourType === "PRIVATE") return "#3b82f6";
  return "#22c55e";
}

export default function HomePage() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const [tours, setTours] = useState<TourPin[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [center, setCenter] = useState({ lat: DEFAULT_LAT, lng: DEFAULT_LNG });

  const fetchTours = useCallback(async (lat: number, lng: number) => {
    try {
      const data = await apiFetch<{ tours: TourPin[] }>(
        `/tours/search?lat=${lat}&lng=${lng}&radiusKm=20&lang=${locale}`
      );
      setTours(data.tours);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [locale]);

  // Re-fetch on locale change so titles update without a manual reload.
  useEffect(() => {
    fetchTours(DEFAULT_LAT, DEFAULT_LNG);
  }, [fetchTours]);

  const handleMapMove = useCallback((lat: number, lng: number) => {
    fetchTours(lat, lng);
  }, [fetchTours]);

  function handleSearch() {
    const query = searchText.trim().toLowerCase();
    if (!query) return;
    for (const [name, coords] of Object.entries(PRESETS)) {
      if (name.toLowerCase().includes(query)) {
        setCenter({ lat: coords[0], lng: coords[1] });
        fetchTours(coords[0], coords[1]);
        return;
      }
    }
    const match = query.match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
    if (match) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);
      setCenter({ lat, lng });
      fetchTours(lat, lng);
    }
  }

  const pins = tours.map((tour) => ({
    id: tour.id,
    lat: tour.meetingPoint.lat,
    lng: tour.meetingPoint.lng,
    title: tour.title,
    color: getDotColor(tour),
    detail: `$${(tour.pricePerPersonCents / 100).toFixed(2)} ${t("perPerson")}`,
  }));

  return (
    <div>
      {/* Hero */}
      <section
        className="relative bg-cover bg-center"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1600&q=80')",
          minHeight: 480,
        }}
      >
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative flex flex-col items-center justify-center text-center px-8 py-24 md:py-32">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-5 leading-tight drop-shadow-lg">
            {t("guest.hero.title")}
          </h1>
          <p className="text-white/85 text-base md:text-lg mb-12 max-w-lg leading-relaxed">
            {t("guest.hero.subtitle")}
          </p>

          <div className="w-full max-w-xl bg-white rounded-full shadow-xl flex items-center pl-7 pr-2.5 py-2.5">
            <div className="flex-1 flex items-center gap-3 min-w-0">
              <MapPin className="w-5 h-5 text-gray-400 shrink-0" />
              <input
                type="text"
                placeholder={t("guest.hero.searchPlaceholder")}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="w-full bg-transparent text-gray-800 text-base placeholder-gray-400 outline-none border-none py-1"
              />
            </div>
            <button
              onClick={handleSearch}
              className="w-12 h-12 rounded-full bg-red-700 hover:bg-red-800 active:bg-red-900 flex items-center justify-center shrink-0 transition-colors shadow-md"
              aria-label={t("search")}
            >
              <Search className="w-5 h-5 text-white" />
            </button>
          </div>

          <div className="flex flex-wrap justify-center gap-2.5 mt-7">
            {Object.entries(PRESETS).map(([name, coords]) => (
              <button
                key={name}
                onClick={() => {
                  setCenter({ lat: coords[0], lng: coords[1] });
                  fetchTours(coords[0], coords[1]);
                  setSearchText(name);
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-white/15 hover:bg-white/25 backdrop-blur-sm rounded-full text-sm text-white font-medium transition-colors border border-white/25"
              >
                <MapPin className="w-3.5 h-3.5" />
                {name}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Map */}
      <section className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 pt-14 pb-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {t("guest.home.toursNearYou")}
          </h2>
          <span className="text-sm text-gray-500 bg-gray-100 px-4 py-1.5 rounded-full font-medium">
            {t("guest.home.toursFound", { count: tours.length })}
          </span>
        </div>
        <div className="rounded-2xl overflow-hidden shadow-sm border border-gray-200">
          <MapView
            center={center}
            pins={pins}
            onPinClick={(id) => router.push(`/tours/${id}`)}
            onMoveEnd={handleMapMove}
            height="420px"
          />
        </div>
      </section>

      {/* Cards */}
      <section className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 pt-8 pb-24">
        <h2 className="text-2xl font-bold text-gray-900 mb-8">
          {t("guest.home.availableExperiences")}
        </h2>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-red-200 border-t-red-700 rounded-full animate-spin" />
          </div>
        ) : tours.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <MapPin className="w-14 h-14 mx-auto mb-4 text-gray-300" />
            <p className="text-xl font-medium">{t("guest.home.noToursFound")}</p>
            <p className="text-sm mt-2 text-gray-400">
              {t("guest.home.tryDifferentLocation")}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-7">
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
      </section>
    </div>
  );
}
