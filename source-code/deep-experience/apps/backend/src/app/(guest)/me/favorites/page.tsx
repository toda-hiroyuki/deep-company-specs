"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, MapPin, Clock } from "lucide-react";
import { useGuestAuth } from "@/lib/guest-auth";
import { useI18n } from "@/lib/i18n";

interface FavoriteItem {
  id: string;
  createdAt: string;
  tour: {
    id: string;
    title: string;
    category: string;
    tourType: string;
    imageUrl: string | null;
    meetingPointName: string;
    pricePerPersonCents: number;
    durationMinutes: number;
  };
}

export default function FavoritesPage() {
  const { t } = useI18n();
  const { guestFetch, isLoggedIn, loading: authLoading } = useGuestAuth();
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !isLoggedIn) return;
    setLoading(true);
    guestFetch("/guest/favorites")
      .then((data: { favorites: FavoriteItem[] }) =>
        setFavorites(data.favorites)
      )
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [authLoading, isLoggedIn, guestFetch]);

  async function handleRemove(tourId: string) {
    setRemoving(tourId);
    try {
      await guestFetch(`/guest/favorites/${tourId}`, { method: "DELETE" });
      setFavorites((prev) => prev.filter((f) => f.tour.id !== tourId));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed");
    } finally {
      setRemoving(null);
    }
  }

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
        {t("guest.me.favorites.title")}
      </h2>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6 text-sm">
          {error}
        </div>
      )}

      {!error && favorites.length === 0 && (
        <div className="text-center py-12 text-gray-500 bg-white rounded-xl border border-gray-200">
          <Heart className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-lg">{t("guest.me.favorites.empty")}</p>
          <p className="text-sm mt-1">{t("guest.me.favorites.emptyHint")}</p>
          <Link
            href="/tours"
            className="inline-block mt-4 px-5 py-2 bg-red-700 !text-white text-sm font-semibold rounded-lg hover:bg-red-800 transition-colors"
          >
            {t("guest.nav.tours")}
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {favorites.map((fav) => (
          <div
            key={fav.id}
            className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
          >
            <Link href={`/tours/${fav.tour.id}`} className="block">
              <div className="relative aspect-[16/10] bg-gray-100">
                {fav.tour.imageUrl ? (
                  <img
                    src={fav.tour.imageUrl}
                    alt={fav.tour.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <MapPin className="w-10 h-10" />
                  </div>
                )}
                <span className="absolute top-2.5 left-2.5 bg-white/90 backdrop-blur-sm text-[11px] font-semibold px-2.5 py-1 rounded-full text-gray-700">
                  {fav.tour.category}
                </span>
              </div>
            </Link>

            <div className="p-4">
              <Link href={`/tours/${fav.tour.id}`}>
                <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 hover:text-red-700 transition-colors">
                  {fav.tour.title}
                </h3>
              </Link>

              <div className="flex items-center gap-1 text-sm text-gray-500 mb-1">
                <MapPin className="w-3.5 h-3.5" />
                <span className="truncate">{fav.tour.meetingPointName}</span>
              </div>
              <div className="flex items-center gap-1 text-sm text-gray-500 mb-3">
                <Clock className="w-3.5 h-3.5" />
                <span>
                  {t("guest.tourDetail.minutes", {
                    count: fav.tour.durationMinutes,
                  })}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-base font-bold text-gray-900">
                  ${(fav.tour.pricePerPersonCents / 100).toFixed(2)}{" "}
                  <span className="text-xs font-normal text-gray-500">
                    {t("perPerson")}
                  </span>
                </span>
                <button
                  onClick={() => handleRemove(fav.tour.id)}
                  disabled={removing === fav.tour.id}
                  className="text-sm text-red-600 hover:text-red-700 disabled:opacity-50 inline-flex items-center gap-1"
                >
                  <Heart className="w-4 h-4 fill-current" />
                  {t("guest.me.favorites.remove")}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
