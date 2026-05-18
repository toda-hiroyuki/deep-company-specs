"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ApiError } from "@/lib/api-error";

interface GuestInfo {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export function useGuestAuth() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [guest, setGuest] = useState<GuestInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("guest_token");
    const savedGuest = localStorage.getItem("guest_info");
    if (saved) {
      setToken(saved);
      if (savedGuest) {
        try {
          setGuest(JSON.parse(savedGuest));
        } catch {
          // ignore parse error
        }
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(
    (newToken: string, guestInfo: GuestInfo) => {
      localStorage.setItem("guest_token", newToken);
      localStorage.setItem("guest_info", JSON.stringify(guestInfo));
      setToken(newToken);
      setGuest(guestInfo);
    },
    []
  );

  const logout = useCallback(() => {
    localStorage.removeItem("guest_token");
    localStorage.removeItem("guest_info");
    setToken(null);
    setGuest(null);
    router.replace("/auth/login");
  }, [router]);

  const guestFetch = useCallback(
    async (path: string, options?: RequestInit) => {
      const t = localStorage.getItem("guest_token");
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
    [logout]
  );

  const isLoggedIn = !!token;

  return { token, guest, loading, isLoggedIn, login, logout, guestFetch };
}
