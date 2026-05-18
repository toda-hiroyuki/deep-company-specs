"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Heart } from "lucide-react";
import { useGuestAuth } from "@/lib/guest-auth";
import { useFavorites } from "@/lib/favorites";

interface FavoriteButtonProps {
  tourId: string;
  // "card": small floating button overlayed on a tour card image.
  // "inline": labeled button used on tour detail page.
  variant?: "card" | "inline";
}

export default function FavoriteButton({
  tourId,
  variant = "card",
}: FavoriteButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoggedIn, loading: authLoading } = useGuestAuth();
  const { isFavorited, toggle, ready } = useFavorites();
  const [busy, setBusy] = useState(false);

  const fav = isFavorited(tourId);

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (authLoading) return;
    if (!isLoggedIn) {
      router.push(`/auth/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (busy) return;
    setBusy(true);
    try {
      await toggle(tourId);
    } catch {
      // Optimistic state already reverted by the provider.
    } finally {
      setBusy(false);
    }
  }

  if (variant === "inline") {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={busy || (isLoggedIn && !ready)}
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors disabled:opacity-50 ${
          fav
            ? "border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
            : "border-gray-300 text-gray-700 hover:bg-gray-50"
        }`}
        aria-pressed={fav}
      >
        <Heart className={`w-4 h-4 ${fav ? "fill-current" : ""}`} />
        {fav ? "Saved" : "Save"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy || (isLoggedIn && !ready)}
      className={`absolute top-2.5 right-2.5 w-9 h-9 rounded-full backdrop-blur-sm flex items-center justify-center transition-colors disabled:opacity-50 ${
        fav
          ? "bg-red-600 text-white hover:bg-red-700"
          : "bg-white/90 text-gray-700 hover:bg-white"
      }`}
      aria-pressed={fav}
      aria-label={fav ? "Remove from favorites" : "Add to favorites"}
    >
      <Heart className={`w-4 h-4 ${fav ? "fill-current" : ""}`} />
    </button>
  );
}
