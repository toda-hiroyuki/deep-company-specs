import { useEffect, useRef, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { GOOGLE_MAPS_API_KEY } from "../lib/config";

interface Pin {
  id: string;
  lat: number;
  lng: number;
  title: string;
  color: string;
  detail: string;
}

interface WebMapProps {
  center: [number, number];
  pins: Pin[];
  onPinPress: (id: string) => void;
  onMoveEnd: (lat: number, lng: number) => void;
}

// Load Google Maps JS API script once
let googleMapsPromise: Promise<void> | null = null;
function loadGoogleMaps(): Promise<void> {
  if (googleMapsPromise) return googleMapsPromise;
  if (typeof window !== "undefined" && window.google?.maps) {
    return Promise.resolve();
  }
  googleMapsPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(script);
  });
  return googleMapsPromise;
}

export default function WebMap({ center, pins, onPinPress, onMoveEnd }: WebMapProps) {
  const { t } = useTranslation("mobile");
  const containerRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const onMoveEndRef = useRef(onMoveEnd);
  onMoveEndRef.current = onMoveEnd;

  // Initialize map
  useEffect(() => {
    if (typeof window === "undefined") return;

    loadGoogleMaps().then(() => {
      if (!containerRef.current || mapRef.current) return;

      const map = new google.maps.Map(containerRef.current, {
        center: { lat: center[0], lng: center[1] },
        zoom: 13,
        mapId: "deep-experience-map",
        disableDefaultUI: false,
        zoomControl: true,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
      });

      map.addListener("idle", () => {
        const c = map.getCenter();
        if (c) onMoveEndRef.current(c.lat(), c.lng());
      });

      mapRef.current = map;
      infoWindowRef.current = new google.maps.InfoWindow();
      setLoaded(true);
    });

    return () => {
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];
      mapRef.current = null;
    };
  }, []);

  // Update markers when pins change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;

    // Clear existing markers
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    // Add new markers (standard drop-pin style with color)
    pins.forEach((pin) => {
      // SVG drop-pin marker colored per tour status
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="30" viewBox="0 0 20 30">
        <path d="M10 0C4.48 0 0 4.48 0 10c0 7.5 10 20 10 20s10-12.5 10-20C20 4.48 15.52 0 10 0z" fill="${pin.color}" stroke="white" stroke-width="1.2"/>
        <circle cx="10" cy="10" r="3.5" fill="white"/>
      </svg>`;
      const marker = new google.maps.Marker({
        position: { lat: pin.lat, lng: pin.lng },
        map,
        icon: {
          url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg),
          scaledSize: new google.maps.Size(20, 30),
          anchor: new google.maps.Point(10, 30),
        },
        title: pin.title,
      });

      marker.addListener("click", () => {
        const iw = infoWindowRef.current;
        if (!iw) return;
        iw.setContent(
          `<div style="font-family:sans-serif">
            <strong style="font-size:14px">${pin.title}</strong><br/>
            <span style="color:#6b7280;font-size:12px">${pin.detail}</span><br/>
            <a href="#" id="pin-link-${pin.id}"
               style="color:#2563eb;font-size:12px;text-decoration:none">
              ${t("tour.viewDetails")}
            </a>
          </div>`
        );
        iw.open(map, marker);

        // Attach click handler after InfoWindow opens
        google.maps.event.addListenerOnce(iw, "domready", () => {
          const link = document.getElementById(`pin-link-${pin.id}`);
          if (link) {
            link.addEventListener("click", (e) => {
              e.preventDefault();
              onPinPress(pin.id);
            });
          }
        });
      });

      markersRef.current.push(marker);
    });
  }, [pins, loaded, onPinPress]);

  // Fly to new center when center prop changes
  useEffect(() => {
    const map = mapRef.current;
    if (map && loaded) {
      map.panTo({ lat: center[0], lng: center[1] });
    }
  }, [center, loaded]);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100%", position: "relative" }}
    />
  );
}
