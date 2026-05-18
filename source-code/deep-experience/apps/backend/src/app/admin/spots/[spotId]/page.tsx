"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/client-auth";
import { useI18n } from "@/lib/i18n";

interface SpotDetail {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  lat: number;
  lng: number;
  locationName: string;
  category: string;
  imageUrls: string[] | string;
  contactEmail: string | null;
  contactPhone: string | null;
  isActive: boolean;
  tours: { id: string; title: string }[];
}

type Lang = "ja" | "en";

// Google Maps component
const GMAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

let gmapsPromise: Promise<void> | null = null;
function loadGoogleMaps(): Promise<void> {
  if (gmapsPromise) return gmapsPromise;
  if (typeof window !== "undefined" && window.google?.maps) return Promise.resolve();
  gmapsPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GMAPS_API_KEY}`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(script);
  });
  return gmapsPromise;
}

function GoogleMapComponent({ lat, lng, name, onLocationChange }: {
  lat: number; lng: number; name: string;
  onLocationChange?: (lat: number, lng: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [popupName, setPopupName] = useState(name);

  const round = (n: number) => Math.round(n * 10000) / 10000;

  async function reverseGeocode(lat: number, lng: number) {
    try {
      const res = await fetch(`/api/v1/geocode?lat=${lat}&lng=${lng}`);
      const data = await res.json();
      const label = data.name || data.displayName?.split(",")[0] || `${lat}, ${lng}`;
      setPopupName(label);
      if (infoWindowRef.current && markerRef.current) {
        infoWindowRef.current.setContent(label);
        infoWindowRef.current.open(mapRef.current!, markerRef.current);
      }
    } catch { /* ignore */ }
  }

  useEffect(() => {
    if (!ref.current) return;

    loadGoogleMaps().then(() => {
      if (!ref.current) return;

      const map = new google.maps.Map(ref.current, {
        center: { lat, lng },
        zoom: 15,
        disableDefaultUI: false,
        zoomControl: true,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
      });
      mapRef.current = map;

      const marker = new google.maps.Marker({
        position: { lat, lng },
        map,
        draggable: !!onLocationChange,
        icon: {
          url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="20" height="30" viewBox="0 0 20 30"><path d="M10 0C4.48 0 0 4.48 0 10c0 7.5 10 20 10 20s10-12.5 10-20C20 4.48 15.52 0 10 0z" fill="#2563eb" stroke="white" stroke-width="1.2"/><circle cx="10" cy="10" r="3.5" fill="white"/></svg>`),
          scaledSize: new google.maps.Size(20, 30),
          anchor: new google.maps.Point(10, 30),
        },
      });
      markerRef.current = marker;

      const infoWindow = new google.maps.InfoWindow({ content: popupName });
      infoWindowRef.current = infoWindow;
      infoWindow.open(map, marker);

      if (onLocationChange) {
        marker.addListener("dragend", () => {
          const pos = marker.getPosition();
          if (!pos) return;
          const rLat = round(pos.lat()), rLng = round(pos.lng());
          onLocationChange(rLat, rLng);
          reverseGeocode(rLat, rLng);
        });
        map.addListener("click", (e: google.maps.MapMouseEvent) => {
          if (!e.latLng) return;
          const rLat = round(e.latLng.lat()), rLng = round(e.latLng.lng());
          marker.setPosition({ lat: rLat, lng: rLng });
          onLocationChange(rLat, rLng);
          reverseGeocode(rLat, rLng);
        });
      }
    });

    return () => {
      if (markerRef.current) { markerRef.current.setMap(null); markerRef.current = null; }
      mapRef.current = null;
    };
  }, [lat, lng]);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!search.trim()) return;
    setSearching(true);
    setSearchError("");
    try {
      const res = await fetch(`/api/v1/geocode?q=${encodeURIComponent(search)}`);
      const results = await res.json();
      if (Array.isArray(results) && results.length > 0) {
        const { lat: newLat, lng: newLng, name: placeName } = results[0];
        setPopupName(placeName || search);
        onLocationChange?.(round(newLat), round(newLng));
      } else {
        setSearchError("該当する場所が見つかりませんでした");
      }
    } catch {
      setSearchError("検索に失敗しました");
    } finally { setSearching(false); }
  }

  return (
    <div>
      {onLocationChange && (
        <>
          <form onSubmit={handleSearch} style={{ display: "flex", gap: 6, marginBottom: 8 }}>
            <input
              className="form-input"
              placeholder="場所を検索（例: 浅草寺、東京タワー、池袋駅）"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ flex: 1, fontSize: 13 }}
            />
            <button type="submit" className="btn btn-primary btn-sm" disabled={searching} style={{ fontSize: 12, whiteSpace: "nowrap" }}>
              {searching ? "検索中..." : "検索"}
            </button>
          </form>
          {searchError && <p style={{ fontSize: 12, color: "#ef4444", marginBottom: 6 }}>{searchError}</p>}
        </>
      )}
      <div ref={ref} style={{ width: "100%", height: 260, borderRadius: 8 }} />
      {onLocationChange && (
        <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>地図クリックまたはピンのドラッグで座標を変更できます</p>
      )}
    </div>
  );
}

// Inline editable field component
function EditableField({
  label,
  value,
  onSave,
  type = "text",
  multiline = false,
  suffix = "",
  selectOptions,
}: {
  label: string;
  value: string | number;
  onSave: (val: string) => Promise<void>;
  type?: "text" | "number";
  multiline?: boolean;
  suffix?: string;
  selectOptions?: { value: string; label: string }[];
}) {
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus();
  }, [editing]);

  // Sync draft when value changes externally
  useEffect(() => { setDraft(String(value)); }, [value]);

  async function handleSave() {
    if (draft === String(value)) { setEditing(false); return; }
    setSaving(true);
    try {
      await onSave(draft);
      setEditing(false);
      setFlash(true);
      setTimeout(() => setFlash(false), 1500);
    } catch {
      // keep editing on error
    } finally {
      setSaving(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !multiline) { e.preventDefault(); handleSave(); }
    if (e.key === "Escape") { setDraft(String(value)); setEditing(false); }
  }

  return (
    <div className="detail-row" style={{ position: "relative" }}>
      <div className="detail-label">{label}</div>
      <div className="detail-value" style={{ display: "flex", alignItems: "flex-start", gap: 8, flex: 1, minWidth: 0 }}>
        {editing ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
            {selectOptions ? (
              <select
                ref={inputRef as React.Ref<HTMLSelectElement>}
                className="form-select"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                style={{ fontSize: 14 }}
              >
                {selectOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            ) : multiline ? (
              <textarea
                ref={inputRef as React.Ref<HTMLTextAreaElement>}
                className="form-textarea"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={4}
                style={{ fontSize: 14 }}
              />
            ) : (
              <input
                ref={inputRef as React.Ref<HTMLInputElement>}
                className="form-input"
                type={type}
                step={type === "number" ? "any" : undefined}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleKeyDown}
                style={{ fontSize: 14 }}
              />
            )}
            <div style={{ display: "flex", gap: 6 }}>
              <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving} style={{ fontSize: 12, padding: "2px 10px" }}>
                {saving ? "保存中..." : t("common.save")}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => { setDraft(String(value)); setEditing(false); }} style={{ fontSize: 12, padding: "2px 10px" }}>
                {t("common.cancel")}
              </button>
            </div>
          </div>
        ) : (
          <>
            <span
              onDoubleClick={() => setEditing(true)}
              style={{ flex: 1, minWidth: 0, cursor: "default", borderRadius: 4, padding: "2px 4px", margin: "-2px -4px" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#f9fafb"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
              title="ダブルクリックで編集"
            >
              {selectOptions
                ? selectOptions.find((o) => o.value === String(value))?.label || String(value)
                : type === "number" && suffix
                  ? `${value} ${suffix}`
                  : String(value)}
            </span>
            <button
              onClick={() => setEditing(true)}
              title="編集"
              style={{
                background: "none", border: "none", cursor: "pointer", padding: "2px 6px",
                color: "#9ca3af", fontSize: 13, flexShrink: 0, borderRadius: 4,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#2563eb"; e.currentTarget.style.background = "#eff6ff"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#9ca3af"; e.currentTarget.style.background = "none"; }}
            >
              ✏️
            </button>
            {flash && (
              <span style={{ color: "#22c55e", fontSize: 12, flexShrink: 0 }}>✓ 保存済み</span>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function AdminSpotDetailPage() {
  const { spotId } = useParams<{ spotId: string }>();
  const router = useRouter();
  const { loading: authLoading, authFetch } = useAuth("admin");
  const { t } = useI18n();
  const [spot, setSpot] = useState<SpotDetail | null>(null);
  const [lang, setLang] = useState<Lang>("ja");

  useEffect(() => {
    if (authLoading) return;
    loadSpot();
  }, [authLoading]);

  async function loadSpot() {
    try {
      const data = await authFetch(`/admin/spots/${spotId}`);
      setSpot(data);
    } catch {
      // handled
    }
  }

  const updateField = useCallback(async (fields: Record<string, unknown>) => {
    await authFetch(`/admin/spots/${spotId}`, {
      method: "PUT",
      body: JSON.stringify(fields),
    });
    await loadSpot();
  }, [spotId, authFetch]);

  async function handleToggleActive() {
    if (!spot) return;
    try {
      await authFetch(`/admin/spots/${spotId}`, {
        method: "PUT",
        body: JSON.stringify({ isActive: !spot.isActive }),
      });
      await loadSpot();
    } catch {
      // handled
    }
  }

  if (authLoading || !spot) return <div className="loading">{t("common.loading")}</div>;

  const imageUrls: string[] = typeof spot.imageUrls === "string" ? JSON.parse(spot.imageUrls) : (spot.imageUrls ?? []);

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">
          <button className="btn btn-ghost btn-sm" style={{ marginRight: 8 }} onClick={() => router.back()}>←</button>
          {spot.name}
        </h1>
        <div className="flex gap-2">
          <button className="btn btn-ghost btn-sm" onClick={handleToggleActive}>
            {spot.isActive ? "無効化" : "有効化"}
          </button>
        </div>
      </div>

      {/* 2-column layout: left = info, right = related tours */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 20 }}>
        {/* Left column */}
        <div>
          {/* Language tabs */}
          <div style={{ display: "flex", gap: 0, marginBottom: 16 }}>
            <button
              className={lang === "ja" ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm"}
              style={{ borderRadius: "6px 0 0 6px" }}
              onClick={() => setLang("ja")}
            >
              日本語
            </button>
            <button
              className={lang === "en" ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm"}
              style={{ borderRadius: "0 6px 6px 0" }}
              onClick={() => setLang("en")}
            >
              English
            </button>
          </div>

          {/* Basic info */}
          <h2 style={{ fontSize: 16, fontWeight: "bold", marginBottom: 12 }}>● 基本情報</h2>
          <div className="card">
            {imageUrls.length > 0 && (
              <div style={{ display: "flex", gap: 8, marginBottom: 12, overflowX: "auto" }}>
                {imageUrls.map((url: string, i: number) => (
                  <img key={i} src={url} alt="" style={{ width: 200, height: 130, objectFit: "cover", borderRadius: 6 }} />
                ))}
              </div>
            )}
            <EditableField
              label="名称"
              value={lang === "ja" ? spot.name : spot.nameEn}
              onSave={(val) => updateField(lang === "ja" ? { name: val } : { nameEn: val })}
            />
            <EditableField
              label="カテゴリ"
              value={spot.category}
              onSave={(val) => updateField({ category: val })}
            />
            <div className="detail-row">
              <div className="detail-label">{t("common.status")}</div>
              <div className="detail-value">
                {spot.isActive
                  ? <span className="badge badge-accepted">{t("common.active")}</span>
                  : <span className="badge badge-cancelled">{t("common.inactive")}</span>}
              </div>
            </div>
          </div>

          {/* Description */}
          <h2 style={{ fontSize: 16, fontWeight: "bold", marginTop: 20, marginBottom: 12 }}>● 説明</h2>
          <div className="card">
            <EditableField
              label={lang === "ja" ? "日本語" : "English"}
              value={lang === "ja" ? spot.description : spot.descriptionEn}
              onSave={(val) => updateField(lang === "ja" ? { description: val } : { descriptionEn: val })}
              multiline
            />
          </div>

          {/* Location */}
          <h2 style={{ fontSize: 16, fontWeight: "bold", marginTop: 20, marginBottom: 12 }}>● 所在地</h2>
          <div className="card">
            <EditableField
              label="所在地名"
              value={spot.locationName}
              onSave={(val) => updateField({ locationName: val })}
            />
            <EditableField
              label="緯度 (Lat)"
              value={spot.lat}
              type="number"
              onSave={(val) => updateField({ lat: parseFloat(val) })}
            />
            <EditableField
              label="経度 (Lng)"
              value={spot.lng}
              type="number"
              onSave={(val) => updateField({ lng: parseFloat(val) })}
            />
            <div style={{ marginTop: 12 }}>
              <GoogleMapComponent lat={spot.lat} lng={spot.lng} name={spot.locationName || spot.name}
                onLocationChange={(lat, lng) => updateField({ lat, lng })} />
            </div>
          </div>

          {/* Contact info */}
          <h2 style={{ fontSize: 16, fontWeight: "bold", marginTop: 20, marginBottom: 12 }}>● 連絡先</h2>
          <div className="card">
            <EditableField
              label="メールアドレス"
              value={spot.contactEmail ?? ""}
              onSave={(val) => updateField({ contactEmail: val || null })}
            />
            <EditableField
              label="電話番号"
              value={spot.contactPhone ?? ""}
              onSave={(val) => updateField({ contactPhone: val || null })}
            />
          </div>
        </div>

        {/* Right column: related tours */}
        <div>
          <h2 style={{ fontSize: 16, fontWeight: "bold", marginBottom: 12 }}>● 関連ツアー ({spot.tours?.length ?? 0})</h2>
          {(!spot.tours || spot.tours.length === 0) ? (
            <p className="text-muted text-sm">関連ツアーはありません</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {spot.tours.map((tour) => (
                <div
                  key={tour.id}
                  className="card"
                  style={{ padding: "10px 14px", cursor: "pointer" }}
                  onClick={() => router.push(`/admin/tours/${tour.id}`)}
                >
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{tour.title}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
