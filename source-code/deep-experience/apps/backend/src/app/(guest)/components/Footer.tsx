"use client";

import { MapPin } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export default function Footer() {
  const { t } = useI18n();

  return (
    <footer className="bg-gray-900 text-gray-400">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5 text-red-500" />
              <span className="text-lg font-bold text-white">
                DEEP<span className="text-red-500">Experience</span>
              </span>
            </div>
            <p className="text-sm">{t("guest.footer.description")}</p>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-3 text-sm uppercase tracking-wider">
              {t("guest.footer.explore")}
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="/tours" className="hover:text-white transition-colors">
                  {t("guest.footer.allTours")}
                </a>
              </li>
              <li>
                <a href="/me/bookings" className="hover:text-white transition-colors">
                  {t("guest.footer.myBookings")}
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-3 text-sm uppercase tracking-wider">
              {t("guest.footer.support")}
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <span className="text-gray-500">help@deepexperience.jp</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-12 pt-8 text-sm text-center">
          {t("guest.footer.copyright", { year: String(new Date().getFullYear()) })}
        </div>
      </div>
    </footer>
  );
}
