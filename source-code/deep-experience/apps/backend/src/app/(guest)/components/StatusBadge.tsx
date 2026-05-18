"use client";

import { useI18n } from "@/lib/i18n";

const STATUS_CLASSES: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  CONFIRMED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-gray-100 text-gray-800",
  EXPIRED: "bg-gray-100 text-gray-500",
  ACCEPTED: "bg-green-100 text-green-800",
  DECLINED: "bg-red-100 text-red-800",
};

const STATUS_KEYS: Record<string, string> = {
  PENDING: "status.pending",
  CONFIRMED: "status.confirmed",
  CANCELLED: "status.cancelled",
  IN_PROGRESS: "status.inProgress",
  COMPLETED: "status.completed",
  EXPIRED: "status.expired",
  ACCEPTED: "status.accepted",
  DECLINED: "status.declined",
};

export default function StatusBadge({ status }: { status: string }) {
  const { t } = useI18n();
  const className = STATUS_CLASSES[status] ?? "bg-gray-100 text-gray-600";
  const key = STATUS_KEYS[status];
  const translated = key ? t(key) : status;
  // If t() falls through and returns the key itself, surface the raw status.
  const label = key && translated === key ? status : translated;

  return (
    <span
      className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${className}`}
    >
      {label}
    </span>
  );
}
