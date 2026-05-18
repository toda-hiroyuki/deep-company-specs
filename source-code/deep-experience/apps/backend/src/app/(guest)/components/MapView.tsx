"use client";

import { useCallback, useRef, useEffect, useState } from "react";

interface Pin {
  id: string;
  lat: number;
  lng: number;
  title: string;
  color: string;
  detail: string;
}

interface MapViewProps {
  center: { lat: number; lng: number };
  pins: Pin[];
  onPinClick?: (id: string) => void;
  onMoveEnd?: (lat: number, lng: number) => void;
  height?: string;
  interactive?: boolean;
}

// Singleton script loader
let mapsPromise: Promise<void> | null = null;
function loadGoogleMaps(): Promise<void> {
  if (mapsPromise) return mapsPromise;
  if (typeof window !== "undefined" && window.google?.maps) {
    return Promise.resolve();
  }
  mapsPromise = new Promise((resolve, reject) => {
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!key) {
      reject(new Error("Google Maps API key not set"));
      return;
    }
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(script);
  });
  return mapsPromise;
}

function makePinSvg(color: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="36" viewBox="0 0 24 36">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 9 12 24 12 24s12-15 12-24C24 5.37 18.63 0 12 0z" fill="${color}" stroke="white" stroke-width="1.5"/>
    <circle cx="12" cy="12" r="4" fill="white"/>
  </svg>`;
}

export default function MapView({
  center,
  pins,
  onPinClick,
  onMoveEnd,
  height = "400px",
  interactive = true,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current) return;

    let cancelled = false;

    loadGoogleMaps()
      .then(() => {
        if (cancelled || !containerRef.current) return;

        const map = new google.maps.Map(containerRef.current, {
          center,
          zoom: 13,
          disableDefaultUI: !interactive,
          gestureHandling: interactive ? "auto" : "none",
          clickableIcons: false,
          styles: [
            {
              featureType: "poi",
              elementType: "labels",
              stylers: [{ visibility: "off" }],
            },
          ],
        });

        if (interactive && onMoveEnd) {
          map.addListener("idle", () => {
            const c = map.getCenter();
            if (c) onMoveEnd(c.lat(), c.lng());
          });
        }

        mapRef.current = map;
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Update center
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.panTo(center);
    }
  }, [center.lat, center.lng]);

  // Update pins
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear old markers
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const map = mapRef.current;

    pins.forEach((pin) => {
      const marker = new google.maps.Marker({
        position: { lat: pin.lat, lng: pin.lng },
        map,
        icon: {
          url:
            "data:image/svg+xml;charset=UTF-8," +
            encodeURIComponent(makePinSvg(pin.color)),
          scaledSize: new google.maps.Size(24, 36),
          anchor: new google.maps.Point(12, 36),
        },
        title: pin.title,
      });

      const infoWindow = new google.maps.InfoWindow({
        content: `<div style="font-family:sans-serif;padding:4px 0">
          <strong style="font-size:14px">${pin.title}</strong>
          <div style="color:#6b7280;font-size:12px;margin-top:2px">${pin.detail}</div>
        </div>`,
      });

      marker.addListener("click", () => {
        infoWindow.open(map, marker);
        if (onPinClick) onPinClick(pin.id);
      });

      markersRef.current.push(marker);
    });
  }, [pins, onPinClick]);

  if (error) {
    return (
      <div
        style={{ height }}
        className="bg-gray-100 rounded-xl flex items-center justify-center text-gray-500 text-sm"
      >
        Map unavailable: {error}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{ height }}
      className="w-full rounded-xl overflow-hidden"
    />
  );
}
