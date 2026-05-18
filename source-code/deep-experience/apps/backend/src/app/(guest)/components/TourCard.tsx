"use client";

import Link from "next/link";
import { MapPin, Clock, Users } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import FavoriteButton from "./FavoriteButton";

interface TourCardProps {
  id: string;
  title: string;
  category: string;
  tourType: string;
  imageUrl: string | null;
  meetingPointName: string;
  pricePerPersonCents: number;
  durationMinutes?: number;
  nextSchedule: {
    startDateTime: string;
    remainingSlots: number;
  } | null;
  distanceKm?: number;
}

export default function TourCard({
  id,
  title,
  category,
  tourType,
  imageUrl,
  meetingPointName,
  pricePerPersonCents,
  durationMinutes,
  nextSchedule,
  distanceKm,
}: TourCardProps) {
  const { t } = useI18n();

  return (
    <Link
      href={`/tours/${id}`}
      className="group block rounded-lg overflow-hidden hover:shadow-lg transition-shadow duration-200"
    >
      <div className="relative aspect-[16/11] bg-gray-100 overflow-hidden rounded-lg">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <MapPin className="w-10 h-10" />
          </div>
        )}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
          <span className="bg-white/90 backdrop-blur-sm text-[11px] font-semibold px-2.5 py-1 rounded-full text-gray-700">
            {category}
          </span>
          {tourType === "PRIVATE" && (
            <span className="bg-blue-600 text-white text-[11px] font-semibold px-2.5 py-1 rounded-full">
              {t("tourType.private")}
            </span>
          )}
        </div>
        <FavoriteButton tourId={id} variant="card" />
      </div>

      <div className="pt-3 pb-1">
        <h3 className="text-sm font-semibold text-gray-900 group-hover:text-red-700 transition-colors leading-snug line-clamp-2 mb-1.5">
          {title}
        </h3>

        <div className="flex items-center gap-1 text-[13px] text-gray-500 mb-0.5">
          <MapPin className="w-3.5 h-3.5 shrink-0 text-gray-400" />
          <span className="truncate">{meetingPointName}</span>
          {distanceKm !== undefined && (
            <span className="shrink-0 text-gray-400">
              · {distanceKm.toFixed(1)} km
            </span>
          )}
        </div>

        {durationMinutes && (
          <div className="flex items-center gap-1 text-[13px] text-gray-500 mb-0.5">
            <Clock className="w-3.5 h-3.5 text-gray-400" />
            <span>{t("guest.tourDetail.minutes", { count: durationMinutes })}</span>
          </div>
        )}

        {nextSchedule && (
          <div className="flex items-center gap-1 text-[13px] text-green-600 font-medium mb-0.5">
            <Users className="w-3.5 h-3.5" />
            <span>{t("guest.tours.spotsLeft", { count: nextSchedule.remainingSlots })}</span>
          </div>
        )}

        <div className="flex items-baseline gap-1 mt-2">
          <span className="text-base font-bold text-gray-900">
            ${(pricePerPersonCents / 100).toFixed(2)}
          </span>
          <span className="text-[13px] text-gray-500">{t("perPerson")}</span>
        </div>
      </div>
    </Link>
  );
}
