"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useGuestAuth } from "@/lib/guest-auth";

interface FavoritesContextValue {
  ready: boolean;
  isFavorited: (tourId: string) => boolean;
  toggle: (tourId: string) => Promise<boolean>; // returns new state
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const { guestFetch, isLoggedIn, loading: authLoading } = useGuestAuth();
  const [ids, setIds] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn) {
      setIds(new Set());
      setReady(true);
      return;
    }
    guestFetch("/guest/favorites")
      .then((data: { favorites: { tour: { id: string } }[] }) => {
        setIds(new Set(data.favorites.map((f) => f.tour.id)));
      })
      .catch(() => {
        // Silently ignore — favorites unavailable shouldn't break browsing.
      })
      .finally(() => setReady(true));
  }, [authLoading, isLoggedIn, guestFetch]);

  const isFavorited = useCallback((tourId: string) => ids.has(tourId), [ids]);

  const toggle = useCallback(
    async (tourId: string): Promise<boolean> => {
      const currentlyFavorited = ids.has(tourId);
      const next = !currentlyFavorited;

      // Optimistic update
      setIds((prev) => {
        const copy = new Set(prev);
        if (next) copy.add(tourId);
        else copy.delete(tourId);
        return copy;
      });

      try {
        if (next) {
          await guestFetch("/guest/favorites", {
            method: "POST",
            body: JSON.stringify({ tourId }),
          });
        } else {
          await guestFetch(`/guest/favorites/${tourId}`, { method: "DELETE" });
        }
        return next;
      } catch (e) {
        // Revert on failure
        setIds((prev) => {
          const copy = new Set(prev);
          if (currentlyFavorited) copy.add(tourId);
          else copy.delete(tourId);
          return copy;
        });
        throw e;
      }
    },
    [ids, guestFetch]
  );

  const value = useMemo<FavoritesContextValue>(
    () => ({ ready, isFavorited, toggle }),
    [ready, isFavorited, toggle]
  );

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites(): FavoritesContextValue {
  const ctx = useContext(FavoritesContext);
  if (!ctx) {
    // Safe defaults outside the provider (e.g. SSR).
    return {
      ready: false,
      isFavorited: () => false,
      toggle: async () => false,
    };
  }
  return ctx;
}
