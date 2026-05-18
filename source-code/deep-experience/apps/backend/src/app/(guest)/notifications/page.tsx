"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Bell, CheckCircle, RefreshCw, Ticket } from "lucide-react";
import { apiFetch } from "../lib/api";
import { useI18n } from "@/lib/i18n";
import { formatTimestamp } from "@/lib/date-format";

interface NotificationItem {
  id: string;
  type: string;
  titleEn: string;
  messageEn: string;
  isRead: boolean;
  createdAt: string;
  booking: {
    id: string;
    status: string;
    tour: { title: string };
  } | null;
}

const TYPE_ICONS: Record<string, { icon: typeof CheckCircle; color: string }> =
  {
    BOOKING_CONFIRMED: { icon: CheckCircle, color: "text-green-600" },
    GUIDE_DECLINED: { icon: RefreshCw, color: "text-amber-500" },
  };

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [hasEmail, setHasEmail] = useState(false);
  const { t, locale } = useI18n();

  useEffect(() => {
    const saved = localStorage.getItem("userEmail");
    if (saved) {
      setEmail(saved);
      setHasEmail(true);
      fetchNotifications(saved);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchNotifications = useCallback(async (emailAddr: string) => {
    try {
      const data = await apiFetch<{ notifications: NotificationItem[] }>(
        `/notifications?email=${encodeURIComponent(emailAddr)}`
      );
      setNotifications(data.notifications);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  async function markRead(id: string) {
    try {
      await apiFetch(`/notifications/${id}/read`, { method: "POST" });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch {
      // continue
    }
  }

  if (!hasEmail) {
    return (
      <div className="max-w-3xl mx-auto px-6 sm:px-8 lg:px-12 py-16 text-center">
        <Bell className="w-12 h-12 mx-auto mb-4 text-gray-300" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {t("guest.notifications.title")}
        </h1>
        <p className="text-gray-500 mb-6">
          {t("guest.notifications.searchFirst")}
        </p>
        <Link
          href="/me/bookings"
          className="inline-block px-6 py-3 bg-red-700 text-white font-semibold rounded-lg hover:bg-red-800 transition-colors"
        >
          {t("guest.notifications.goToBookings")}
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-3">
        {t("guest.notifications.title")}
      </h1>
      <p className="text-gray-500 mb-10">
        {t("guest.notifications.subtitle")}
      </p>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-red-200 border-t-red-700 rounded-full animate-spin" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Bell className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-lg">{t("guest.notifications.empty")}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {notifications.map((item) => {
            const config = TYPE_ICONS[item.type];
            const IconComp = config?.icon || Bell;
            const iconColor = config?.color || "text-gray-400";

            return (
              <div
                key={item.id}
                className={`bg-white rounded-xl shadow-sm border p-4 transition-colors ${
                  item.isRead
                    ? "border-gray-200"
                    : "border-l-4 border-l-red-600 border-gray-200"
                }`}
              >
                <div className="flex items-start gap-3">
                  <IconComp className={`w-5 h-5 mt-0.5 shrink-0 ${iconColor}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3
                        className={`text-sm font-medium ${
                          item.isRead ? "text-gray-700" : "text-gray-900 font-semibold"
                        }`}
                      >
                        {item.titleEn}
                      </h3>
                      {!item.isRead && (
                        <span className="w-2 h-2 rounded-full bg-red-600 shrink-0" />
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                      {item.messageEn}
                    </p>
                    {item.booking && (
                      <Link
                        href={`/me/bookings/${item.booking.id}`}
                        className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-red-700 mt-2"
                        onClick={() => !item.isRead && markRead(item.id)}
                      >
                        <Ticket className="w-3 h-3" />
                        {item.booking.tour.title}
                      </Link>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {formatTimestamp(item.createdAt, locale)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
