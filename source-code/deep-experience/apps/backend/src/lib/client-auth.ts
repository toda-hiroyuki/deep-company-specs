"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ApiError } from "@/lib/api-error";

export function useAuth(role: "admin" | "guide" | "company") {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem(`${role}_token`);
    if (!saved) {
      router.replace(`/${role}/login`);
    } else {
      setToken(saved);
    }
    setLoading(false);
  }, [role, router]);

  const logout = useCallback(() => {
    localStorage.removeItem(`${role}_token`);
    setToken(null);
    router.replace(`/${role}/login`);
  }, [role, router]);

  const authFetch = useCallback(
    async (path: string, options?: RequestInit) => {
      const t = localStorage.getItem(`${role}_token`);
      const res = await fetch(`/api/v1${path}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...(t ? { Authorization: `Bearer ${t}` } : {}),
          ...options?.headers,
        },
      });
      if (res.status === 401) {
        logout();
        throw new ApiError("Session expired", "UNAUTHORIZED", 401);
      }
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new ApiError(
          data?.error?.message || "Request failed",
          data?.error?.code ?? null,
          res.status,
          data?.error?.details
        );
      }
      return data;
    },
    [role, logout]
  );

  return { token, loading, logout, authFetch };
}

export function statusBadgeClass(status: string): string {
  return `badge badge-${status.toLowerCase().replace(/_/g, "-")}`;
}

// BookingStatus, AssignmentStatus, ScheduleStatus all flow through here.
// Codes overlap (e.g. PENDING is used by both Booking and Assignment), so we
// map them once to a shared i18n key under common.status.*.
const STATUS_KEYS: Record<string, string> = {
  PENDING: "status.pending",
  CONFIRMED: "status.confirmed",
  CANCELLED: "status.cancelled",
  IN_PROGRESS: "status.inProgress",
  COMPLETED: "status.completed",
  EXPIRED: "status.expired",
  ACCEPTED: "status.accepted",
  DECLINED: "status.declined",
  OPEN: "status.open",
  FULL: "status.full",
};

export function statusLabel(
  status: string,
  t: (key: string) => string
): string {
  const key = STATUS_KEYS[status];
  if (!key) return status; // unknown enum value: surface raw so it's debuggable
  const translated = t(key);
  // If the i18n lookup miss-fallback returned the key itself, show raw status
  // rather than a confusing "status.xxx" string.
  return translated === key ? status : translated;
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
