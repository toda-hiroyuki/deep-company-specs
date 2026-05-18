"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth, statusBadgeClass, formatPrice } from "@/lib/client-auth";
import { useI18n } from "@/lib/i18n";
import ScheduleManager from "./components/ScheduleManager";
import ScheduleList from "./components/ScheduleList";

interface Schedule {
  id: string;
  startDateTime: string;
  endDateTime: string;
  capacity: number;
  status: string;
}

interface RatePrice {
  id: string;
  pricingCategoryId: string;
  priceCents: number;
}

interface PricingCategory {
  id: string;
  label: string;
  labelJa: string;
  minAge: number | null;
  maxAge: number | null;
  sortOrder: number;
  isDefault: boolean;
  ratePrices: RatePrice[];
}

interface Rate {
  id: string;
  label: string;
  labelJa: string;
  isDefault: boolean;
  ratePrices: (RatePrice & { pricingCategory: PricingCategory })[];
}

interface CapacityRule {
  id: string;
  ruleType: string;
  daysOfWeek: number[];
  startDate: string | null;
  endDate: string | null;
  singleDate: string | null;
  startTimes: { hour: number; minute: number }[];
  capacity: number;
  minParticipants: number;
  priority: number;
  isActive: boolean;
}

interface CloseOut {
  id: string;
  date: string;
  startTime: { hour: number; minute: number } | null;
  reason: string | null;
}

interface TourDetail {
  id: string;
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;
  meetingPointLat: number;
  meetingPointLng: number;
  meetingPointName: string;
  durationMinutes: number;
  pricePerPersonCents: number;
  maxParticipants: number;
  tourType: string;
  category: string;
  imageUrls: string[];
  isActive: boolean;
  spotId: string | null;
  area: string;
  areaDetail: string;
  cancellationPolicy: string;
  paymentMethod: string;
  supportedLanguages: string[];
  bookingType: string;
  meetingType: string;
  ticketSupport: string;
  capacityModel: string;
  dailyCapacity: number | null;
  maxDeparturesPerDay: number | null;
  bookingCutoffMinutes: number | null;
  freeCancellationDeadlineHours: number | null;
  highlightsJa: string;
  highlightsEn: string;
  inclusionsJa: string;
  inclusionsEn: string;
  importantNotesJa: string;
  importantNotesEn: string;
  bookingNotesJa: string;
  bookingNotesEn: string;
  meetingPointDescJa: string;
  meetingPointDescEn: string;
  accessInfoJa: string;
  accessInfoEn: string;
  tags: string[];
  schedules: Schedule[];
  pricingCategories: PricingCategory[];
  rates: Rate[];
  capacityRules: CapacityRule[];
  closeOuts: CloseOut[];
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

// Inline editable field
function EditableField({
  label, value, onSave, type = "text", multiline = false, suffix = "", selectOptions, helpText, min,
}: {
  label: string;
  value: string | number | null;
  onSave: (val: string) => Promise<void>;
  type?: "text" | "number";
  multiline?: boolean;
  suffix?: string;
  selectOptions?: { value: string; label: string }[];
  helpText?: string;
  min?: number;
}) {
  const { t } = useI18n();
  const stringify = (v: string | number | null) => (v == null ? "" : String(v));
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(stringify(value));
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(null);

  useEffect(() => { if (editing && inputRef.current) inputRef.current.focus(); }, [editing]);
  useEffect(() => { setDraft(stringify(value)); }, [value]);

  async function handleSave() {
    if (draft === stringify(value)) { setEditing(false); return; }
    setSaving(true);
    try {
      await onSave(draft);
      setEditing(false);
      setFlash(true);
      setTimeout(() => setFlash(false), 1500);
    } catch { /* keep editing */ } finally { setSaving(false); }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !multiline) { e.preventDefault(); handleSave(); }
    if (e.key === "Escape") { setDraft(stringify(value)); setEditing(false); }
  }

  return (
    <div className="detail-row">
      <div className="detail-label">{label}</div>
      <div className="detail-value" style={{ display: "flex", alignItems: "flex-start", gap: 8, flex: 1, minWidth: 0 }}>
        {editing ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
            {selectOptions ? (
              <select ref={inputRef as React.Ref<HTMLSelectElement>} className="form-select" value={draft} onChange={(e) => setDraft(e.target.value)} style={{ fontSize: 14 }}>
                {selectOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            ) : multiline ? (
              <textarea ref={inputRef as React.Ref<HTMLTextAreaElement>} className="form-textarea" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={handleKeyDown} rows={4} style={{ fontSize: 14 }} />
            ) : (
              <input ref={inputRef as React.Ref<HTMLInputElement>} className="form-input" type={type} step={type === "number" ? "any" : undefined} min={type === "number" ? min : undefined} value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={handleKeyDown} style={{ fontSize: 14 }} />
            )}
            {helpText && <div style={{ fontSize: 11, color: "#9ca3af" }}>{helpText}</div>}
            <div style={{ display: "flex", gap: 6 }}>
              <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving} style={{ fontSize: 12, padding: "2px 10px" }}>
                {saving ? t("tour.saving") : t("common.save")}
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
              style={{ flex: 1, minWidth: 0, cursor: "default", borderRadius: 4, padding: "2px 4px", margin: "-2px -4px", whiteSpace: multiline ? "pre-wrap" : undefined }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#f9fafb"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
            >
              {value == null || value === ""
                ? "—"
                : selectOptions
                ? selectOptions.find((o) => o.value === String(value))?.label || String(value)
                : type === "number" && suffix ? `${value} ${suffix}` : String(value)}
            </span>
            <button onClick={() => setEditing(true)} style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 6px", color: "#9ca3af", fontSize: 13, flexShrink: 0, borderRadius: 4 }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#2563eb"; e.currentTarget.style.background = "#eff6ff"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#9ca3af"; e.currentTarget.style.background = "none"; }}
            >✏️</button>
            {flash && <span style={{ color: "#22c55e", fontSize: 12, flexShrink: 0 }}>✓</span>}
          </>
        )}
      </div>
    </div>
  );
}

export default function AdminTourDetailPage() {
  const { tourId } = useParams<{ tourId: string }>();
  const router = useRouter();
  const { loading: authLoading, authFetch } = useAuth("admin");
  const { t } = useI18n();
  const [tour, setTour] = useState<TourDetail | null>(null);
  const [lang, setLang] = useState<Lang>("ja");
  const [scheduleTab, setScheduleTab] = useState<"rules" | "list">("rules");
  const [tourMedia, setTourMedia] = useState<{ id: string; filename: string; originalUrl: string; thumbnailUrl: string; sortOrder: number; linkId: string }[]>([]);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [allMedia, setAllMedia] = useState<{ id: string; filename: string; thumbnailUrl: string; originalUrl: string }[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const mediaFileRef = useRef<HTMLInputElement>(null);
  // Cover image editor (Tour.imageUrls) — distinct from the TourMedia gallery.
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const coverFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (!authLoading) { loadTour(); loadTourMedia(); } }, [authLoading]);

  async function loadTour() {
    try { setTour(await authFetch(`/admin/tours/${tourId}`)); } catch { /* handled */ }
  }

  const updateField = useCallback(async (fields: Record<string, unknown>) => {
    await authFetch(`/admin/tours/${tourId}`, { method: "PUT", body: JSON.stringify(fields) });
    await loadTour();
  }, [tourId, authFetch]);

  async function handleToggleActive() {
    if (!tour) return;
    try { await updateField({ isActive: !tour.isActive }); } catch { /* handled */ }
  }

  async function loadTourMedia() {
    try {
      const data = await authFetch(`/admin/tours/${tourId}/media`);
      setTourMedia(data.media || []);
    } catch { /* handled */ }
  }

  async function handleMediaUpload(files: FileList) {
    setUploadingMedia(true);
    try {
      const token = localStorage.getItem("admin_token");
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/v1/admin/media/upload", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        if (res.ok) {
          const media = await res.json();
          await authFetch(`/admin/tours/${tourId}/media`, {
            method: "POST", body: JSON.stringify({ mediaId: media.id }),
          });
        }
      }
      await loadTourMedia();
    } finally { setUploadingMedia(false); }
  }

  async function handleUnlinkMedia(mediaId: string) {
    await authFetch(`/admin/tours/${tourId}/media/${mediaId}`, { method: "DELETE" });
    await loadTourMedia();
  }

  async function openMediaPicker() {
    try {
      const data = await authFetch("/admin/media?limit=100");
      setAllMedia(data.media || []);
      setShowMediaPicker(true);
    } catch { /* handled */ }
  }

  async function handlePickMedia(mediaId: string) {
    await authFetch(`/admin/tours/${tourId}/media`, {
      method: "POST", body: JSON.stringify({ mediaId }),
    });
    setShowMediaPicker(false);
    await loadTourMedia();
  }

  // ---- Cover image (Tour.imageUrls) handlers ----
  // imageUrls stores raw URL strings on the Tour row. Upload still goes through
  // /admin/media/upload to get a hosted URL, but we don't link a TourMedia row.
  async function handleCoverUpload(files: FileList) {
    if (!tour) return;
    setUploadingCover(true);
    try {
      const token = localStorage.getItem("admin_token");
      const newUrls: string[] = [];
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/v1/admin/media/upload", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        if (res.ok) {
          const media = await res.json();
          newUrls.push(media.originalUrl);
        }
      }
      if (newUrls.length > 0) {
        await updateField({ imageUrls: [...tour.imageUrls, ...newUrls] });
      }
    } finally { setUploadingCover(false); }
  }

  async function handleRemoveCover(url: string) {
    if (!tour) return;
    await updateField({ imageUrls: tour.imageUrls.filter((u) => u !== url) });
  }

  async function openCoverPicker() {
    try {
      const data = await authFetch("/admin/media?limit=100");
      setAllMedia(data.media || []);
      setShowCoverPicker(true);
    } catch { /* handled */ }
  }

  async function handlePickCover(originalUrl: string) {
    if (!tour) return;
    if (tour.imageUrls.includes(originalUrl)) {
      setShowCoverPicker(false);
      return;
    }
    await updateField({ imageUrls: [...tour.imageUrls, originalUrl] });
    setShowCoverPicker(false);
  }

  if (authLoading || !tour) return <div className="loading">{t("common.loading")}</div>;

  const langTabs: { key: Lang; label: string }[] = [
    { key: "ja", label: "日本語" },
    { key: "en", label: "English" },
  ];

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">
          <button className="btn btn-ghost btn-sm" style={{ marginRight: 8 }} onClick={() => router.back()}>←</button>
          {tour.title}
        </h1>
        <div className="flex gap-2" style={{ alignItems: "center" }}>
          {tour.isActive
            ? <span className="badge badge-accepted" style={{ fontSize: 13, lineHeight: 1, padding: "4px 10px" }}>{t("common.active")}</span>
            : <span className="badge badge-cancelled" style={{ fontSize: 13, lineHeight: 1, padding: "4px 10px" }}>{t("common.inactive")}</span>}
          <a
            href={`/tours/${tourId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost btn-sm"
            style={{ fontSize: 13, padding: "4px 12px", textDecoration: "none" }}
            title={t("tour.previewHint")}
          >
            {t("tour.preview")} ↗
          </a>
          <button className="btn btn-ghost btn-sm" style={{ fontSize: 13, padding: "4px 12px" }} onClick={handleToggleActive}>
            {tour.isActive ? t("tour.deactivate") : t("tour.activate")}
          </button>
        </div>
      </div>

      {/* 2-column: left=main, right=sidebar */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 24 }}>
        {/* ============ LEFT COLUMN ============ */}
        <div>
          {/* ● 基本設定 */}
          <h2 style={{ fontSize: 16, fontWeight: "bold", marginBottom: 12 }}>● 基本設定</h2>
          <div className="card">
            <EditableField label="種別" value={tour.tourType} onSave={(v) => updateField({ tourType: v })}
              selectOptions={[{ value: "GROUP", label: "GROUP" }, { value: "PRIVATE", label: "PRIVATE" }]} />
            <EditableField label="メインエリア" value={tour.area} onSave={(v) => updateField({ area: v })} />
            <EditableField label="エリア詳細" value={tour.areaDetail} onSave={(v) => updateField({ areaDetail: v })} />
            <EditableField label="所要時間" value={tour.durationMinutes} type="number" suffix="分"
              onSave={(v) => updateField({ durationMinutes: parseInt(v) })} />
            <EditableField label="料金 (cents)" value={tour.pricePerPersonCents} type="number"
              onSave={(v) => updateField({ pricePerPersonCents: parseInt(v) })} />
            <div className="detail-row">
              <div className="detail-label"></div>
              <div className="detail-value" style={{ fontSize: 12, color: "#6b7280" }}>= {formatPrice(tour.pricePerPersonCents)}</div>
            </div>
            <EditableField label="最大参加人数" value={tour.maxParticipants} type="number"
              onSave={(v) => updateField({ maxParticipants: parseInt(v) })} />
            <EditableField label="キャンセルポリシー" value={tour.cancellationPolicy} onSave={(v) => updateField({ cancellationPolicy: v })} multiline />
            <EditableField label="精算方法" value={tour.paymentMethod}
              onSave={(v) => updateField({ paymentMethod: v })}
              selectOptions={[
                { value: "ON_SITE", label: "現地払い" },
                { value: "ONLINE", label: "オンライン決済" },
                { value: "BOTH", label: "両方" },
              ]} />
            <EditableField label="対応言語" value={(tour.supportedLanguages || []).join(", ")}
              onSave={(v) => updateField({ supportedLanguages: v.split(",").map((s: string) => s.trim()).filter(Boolean) })} />
            <EditableField label="予約タイプ" value={tour.bookingType}
              onSave={(v) => updateField({ bookingType: v })}
              selectOptions={[
                { value: "DATE_AND_TIME", label: "日時指定" },
                { value: "DATE", label: "日付のみ" },
                { value: "PASS", label: "パス（日付不問）" },
              ]} />
            <EditableField label="定員モデル" value={tour.capacityModel}
              onSave={(v) => updateField({ capacityModel: v })}
              selectOptions={[
                { value: "LIMITED", label: "残席管理" },
                { value: "FREE_SALE", label: "定員制限なし" },
                { value: "ON_REQUEST", label: "手動承認制" },
              ]} />
            <EditableField label="日別在庫上限" value={tour.dailyCapacity} type="number" suffix="人/日" min={1}
              helpText="空欄 = 無制限"
              onSave={(v) => updateField({ dailyCapacity: v === "" ? null : Number(v) })} />
            <EditableField label="1日の催行回数上限" value={tour.maxDeparturesPerDay} type="number" suffix="回/日" min={1}
              helpText="空欄 = 無制限"
              onSave={(v) => updateField({ maxDeparturesPerDay: v === "" ? null : Number(v) })} />
            <EditableField label="予約受付締切（出発の何分前）" value={tour.bookingCutoffMinutes} type="number" suffix="分前" min={0}
              helpText="空欄 = 締切なし"
              onSave={(v) => updateField({ bookingCutoffMinutes: v === "" ? null : Number(v) })} />
            <EditableField label="無料キャンセル締切（出発の何時間前）" value={tour.freeCancellationDeadlineHours} type="number" suffix="時間前" min={0}
              helpText="空欄 = 常に有料キャンセル"
              onSave={(v) => updateField({ freeCancellationDeadlineHours: v === "" ? null : Number(v) })} />
          </div>

          {/* ● ロケーション */}
          <h2 style={{ fontSize: 16, fontWeight: "bold", marginTop: 24, marginBottom: 12 }}>● ロケーション</h2>
          <div className="card">
            <EditableField label="集合場所" value={tour.meetingPointName} onSave={(v) => updateField({ meetingPointName: v })} />
            <EditableField label="緯度" value={tour.meetingPointLat} type="number" onSave={(v) => updateField({ meetingPointLat: parseFloat(v) })} />
            <EditableField label="経度" value={tour.meetingPointLng} type="number" onSave={(v) => updateField({ meetingPointLng: parseFloat(v) })} />
            <div style={{ marginTop: 12 }}>
              <GoogleMapComponent lat={tour.meetingPointLat} lng={tour.meetingPointLng} name={tour.meetingPointName}
                onLocationChange={(lat, lng) => updateField({ meetingPointLat: lat, meetingPointLng: lng })} />
            </div>
          </div>

          {/* ● 多言語対応 */}
          <h2 style={{ fontSize: 16, fontWeight: "bold", marginTop: 24, marginBottom: 12 }}>● 多言語対応</h2>
          <div style={{ display: "flex", gap: 0, marginBottom: 12 }}>
            {langTabs.map((tab, i) => (
              <button key={tab.key}
                className={lang === tab.key ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm"}
                style={{ borderRadius: i === 0 ? "6px 0 0 6px" : i === langTabs.length - 1 ? "0 6px 6px 0" : 0 }}
                onClick={() => setLang(tab.key)}
              >{tab.label}</button>
            ))}
          </div>
          <div className="card">
            <EditableField label="商品名" value={lang === "ja" ? tour.title : tour.titleEn}
              onSave={(v) => updateField(lang === "ja" ? { title: v } : { titleEn: v })} />
            <EditableField label="商品概要" value={lang === "ja" ? tour.description : tour.descriptionEn}
              onSave={(v) => updateField(lang === "ja" ? { description: v } : { descriptionEn: v })} multiline />
            <EditableField label="アクセス" value={lang === "ja" ? tour.accessInfoJa : tour.accessInfoEn}
              onSave={(v) => updateField(lang === "ja" ? { accessInfoJa: v } : { accessInfoEn: v })} multiline />
            <EditableField label="集合場所説明" value={lang === "ja" ? tour.meetingPointDescJa : tour.meetingPointDescEn}
              onSave={(v) => updateField(lang === "ja" ? { meetingPointDescJa: v } : { meetingPointDescEn: v })} multiline />
            <EditableField label="見どころ" value={lang === "ja" ? tour.highlightsJa : tour.highlightsEn}
              onSave={(v) => updateField(lang === "ja" ? { highlightsJa: v } : { highlightsEn: v })} multiline />
            <EditableField label="含まれるもの" value={lang === "ja" ? tour.inclusionsJa : tour.inclusionsEn}
              onSave={(v) => updateField(lang === "ja" ? { inclusionsJa: v } : { inclusionsEn: v })} multiline />
            <EditableField label="重要事項" value={lang === "ja" ? tour.importantNotesJa : tour.importantNotesEn}
              onSave={(v) => updateField(lang === "ja" ? { importantNotesJa: v } : { importantNotesEn: v })} multiline />
            <EditableField label="予約確認事項" value={lang === "ja" ? tour.bookingNotesJa : tour.bookingNotesEn}
              onSave={(v) => updateField(lang === "ja" ? { bookingNotesJa: v } : { bookingNotesEn: v })} multiline />
          </div>

          {/* ● 料金設定 */}
          <h2 style={{ fontSize: 16, fontWeight: "bold", marginTop: 24, marginBottom: 12 }}>● 料金設定</h2>
          <div className="card">
            {tour.pricingCategories.length === 0 ? (
              <p className="text-muted text-sm">料金カテゴリが未設定です</p>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                    <th style={{ textAlign: "left", padding: "6px 8px", fontWeight: 600 }}>カテゴリ</th>
                    <th style={{ textAlign: "left", padding: "6px 8px", fontWeight: 600 }}>年齢</th>
                    {tour.rates.map((rate) => (
                      <th key={rate.id} style={{ textAlign: "right", padding: "6px 8px", fontWeight: 600 }}>
                        {rate.labelJa || rate.label}
                        {rate.isDefault && <span style={{ fontSize: 10, color: "#9ca3af" }}> (default)</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tour.pricingCategories.map((cat) => (
                    <tr key={cat.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "6px 8px" }}>
                        {cat.labelJa || cat.label}
                        {cat.isDefault && <span style={{ fontSize: 10, color: "#2563eb" }}> ★</span>}
                      </td>
                      <td style={{ padding: "6px 8px", color: "#6b7280" }}>
                        {cat.minAge != null && cat.maxAge != null
                          ? `${cat.minAge}〜${cat.maxAge}歳`
                          : cat.minAge != null ? `${cat.minAge}歳〜`
                          : cat.maxAge != null ? `〜${cat.maxAge}歳`
                          : "—"}
                      </td>
                      {tour.rates.map((rate) => {
                        const rp = rate.ratePrices.find((p) => p.pricingCategoryId === cat.id);
                        return (
                          <td key={rate.id} style={{ padding: "6px 8px", textAlign: "right" }}>
                            {rp ? formatPrice(rp.priceCents) : "—"}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* ● 日程管理（タブ: 可能枠ルール / 催行回一覧） */}
          <div style={{ marginTop: 24 }}>
            <div style={{ display: "flex", gap: 0, marginBottom: 12 }}>
              <button
                className={scheduleTab === "rules" ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm"}
                style={{ borderRadius: "6px 0 0 6px" }}
                onClick={() => setScheduleTab("rules")}
              >
                可能枠・カレンダー
              </button>
              <button
                className={scheduleTab === "list" ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm"}
                style={{ borderRadius: "0 6px 6px 0" }}
                onClick={() => setScheduleTab("list")}
              >
                催行回一覧
              </button>
            </div>
            {scheduleTab === "rules" ? (
              <ScheduleManager
                capacityRules={tour.capacityRules}
                closeOuts={tour.closeOuts}
                schedules={tour.schedules}
                tourId={tourId}
                durationMinutes={tour.durationMinutes}
                maxParticipants={tour.maxParticipants}
                authFetch={authFetch}
                onRefresh={loadTour}
              />
            ) : (
              <ScheduleList
                tourId={tourId}
                authFetch={authFetch}
                freeCancellationDeadlineHours={tour.freeCancellationDeadlineHours}
                bookingCutoffMinutes={tour.bookingCutoffMinutes}
              />
            )}
          </div>

          {/* ● 注文時の質問 (stub) */}
          <h2 style={{ fontSize: 16, fontWeight: "bold", marginTop: 24, marginBottom: 12 }}>● 注文時の質問</h2>
          <div className="card" style={{ opacity: 0.5 }}>
            <p className="text-muted text-sm">質問は登録されていません。</p>
          </div>
        </div>

        {/* ============ RIGHT SIDEBAR ============ */}
        <div>
          {/* カテゴリ */}
          <h3 style={{ fontSize: 14, fontWeight: "bold", marginBottom: 8 }}>● カテゴリ</h3>
          <div className="card" style={{ marginBottom: 16 }}>
            <EditableField label="" value={tour.category} onSave={(v) => updateField({ category: v })} />
          </div>

          {/* タグ */}
          <h3 style={{ fontSize: 14, fontWeight: "bold", marginBottom: 8 }}>● タグ</h3>
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
              {(tour.tags || []).map((tag, i) => (
                <span key={i} className="badge badge-open" style={{ fontSize: 12 }}>{tag}</span>
              ))}
              {(!tour.tags || tour.tags.length === 0) && <span className="text-muted text-sm">—</span>}
            </div>
            <EditableField label="タグ (カンマ区切り)" value={(tour.tags || []).join(", ")}
              onSave={(v) => updateField({ tags: v.split(",").map((s: string) => s.trim()).filter(Boolean) })} />
          </div>

          {/* ツアーガイド設定 (stub) */}
          <h3 style={{ fontSize: 14, fontWeight: "bold", marginBottom: 8 }}>● ツアーガイド設定</h3>
          <div className="card" style={{ marginBottom: 16, opacity: 0.5 }}>
            <p className="text-muted text-sm">未設定</p>
          </div>

          {/* メイン画像 (Tour.imageUrls): 一覧サムネイル・詳細ヒーロー用 */}
          <h3 style={{ fontSize: 14, fontWeight: "bold", marginBottom: 4 }}>● {t("media.coverTitle")}</h3>
          <p className="text-sm text-muted" style={{ marginBottom: 8, fontSize: 11 }}>
            {t("media.coverHint")}
          </p>
          <div className="card" style={{ marginBottom: 16 }}>
            {tour.imageUrls.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {tour.imageUrls.map((url, i) => (
                  <div key={`${url}-${i}`} style={{ position: "relative" }}>
                    <img src={url} alt="" style={{ width: "100%", height: 120, objectFit: "cover", borderRadius: 6 }} />
                    {i === 0 && (
                      <span
                        className="badge badge-accepted"
                        style={{
                          position: "absolute", top: 4, left: 4,
                          fontSize: 10, padding: "2px 6px",
                        }}
                      >
                        {t("media.heroBadge")}
                      </span>
                    )}
                    <button
                      onClick={() => handleRemoveCover(url)}
                      style={{
                        position: "absolute", top: 4, right: 4,
                        background: "rgba(0,0,0,0.6)", color: "#fff",
                        border: "none", borderRadius: "50%",
                        width: 22, height: 22, cursor: "pointer",
                        fontSize: 12, lineHeight: 1,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                      title={t("media.unlink")}
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted text-sm" style={{ marginBottom: 8 }}>{t("media.empty")}</p>
            )}
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              <input ref={coverFileRef} type="file" accept="image/*" multiple style={{ display: "none" }}
                onChange={(e) => e.target.files && handleCoverUpload(e.target.files)} />
              <button className="btn btn-primary btn-sm" style={{ fontSize: 11 }}
                disabled={uploadingCover} onClick={() => coverFileRef.current?.click()}>
                {uploadingCover ? t("media.uploading") : `+ ${t("media.upload")}`}
              </button>
              <button className="btn btn-sm" style={{ fontSize: 11 }} onClick={openCoverPicker}>
                {t("media.selectExisting")}
              </button>
            </div>
          </div>

          {/* ギャラリー (TourMedia): 詳細画面の写真集 */}
          <h3 style={{ fontSize: 14, fontWeight: "bold", marginBottom: 4 }}>● {t("media.gallery")}</h3>
          <p className="text-sm text-muted" style={{ marginBottom: 8, fontSize: 11 }}>
            {t("media.galleryHint")}
          </p>
          <div className="card" style={{ marginBottom: 16 }}>
            {tourMedia.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {tourMedia.map((m) => (
                  <div key={m.id} style={{ position: "relative" }}>
                    <img src={m.originalUrl} alt="" style={{ width: "100%", height: 120, objectFit: "cover", borderRadius: 6 }} />
                    <button
                      onClick={() => handleUnlinkMedia(m.id)}
                      style={{
                        position: "absolute", top: 4, right: 4,
                        background: "rgba(0,0,0,0.6)", color: "#fff",
                        border: "none", borderRadius: "50%",
                        width: 22, height: 22, cursor: "pointer",
                        fontSize: 12, lineHeight: 1,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                      title={t("media.unlink")}
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted text-sm" style={{ marginBottom: 8 }}>{t("media.empty")}</p>
            )}
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              <input ref={mediaFileRef} type="file" accept="image/*" multiple style={{ display: "none" }}
                onChange={(e) => e.target.files && handleMediaUpload(e.target.files)} />
              <button className="btn btn-primary btn-sm" style={{ fontSize: 11 }}
                disabled={uploadingMedia} onClick={() => mediaFileRef.current?.click()}>
                {uploadingMedia ? t("media.uploading") : `+ ${t("media.upload")}`}
              </button>
              <button className="btn btn-sm" style={{ fontSize: 11 }} onClick={openMediaPicker}>
                {t("media.selectExisting")}
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Media picker modal */}
      {showMediaPicker && (
        <div className="modal-overlay" onClick={() => setShowMediaPicker(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: 600 }}>
            <h3 style={{ fontSize: 18, fontWeight: "bold", marginBottom: 16 }}>{t("media.selectExisting")}</h3>
            {allMedia.length === 0 ? (
              <p className="text-muted">{t("media.empty")}</p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, maxHeight: 400, overflowY: "auto" }}>
                {allMedia.filter((m) => !tourMedia.some((tm) => tm.id === m.id)).map((m) => (
                  <div key={m.id} style={{ cursor: "pointer", borderRadius: 8, overflow: "hidden", border: "1px solid #e5e7eb" }}
                    onClick={() => handlePickMedia(m.id)}>
                    <img src={m.thumbnailUrl} alt={m.filename} style={{ width: "100%", height: 100, objectFit: "cover" }} />
                    <p style={{ fontSize: 11, padding: "4px 6px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.filename}</p>
                  </div>
                ))}
              </div>
            )}
            <div style={{ marginTop: 16 }}>
              <button className="btn btn-ghost" onClick={() => setShowMediaPicker(false)}>{t("common.cancel")}</button>
            </div>
          </div>
        </div>
      )}

      {/* Cover picker modal — Tour.imageUrls */}
      {showCoverPicker && (
        <div className="modal-overlay" onClick={() => setShowCoverPicker(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: 600 }}>
            <h3 style={{ fontSize: 18, fontWeight: "bold", marginBottom: 16 }}>{t("media.selectExisting")}</h3>
            {allMedia.length === 0 ? (
              <p className="text-muted">{t("media.empty")}</p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, maxHeight: 400, overflowY: "auto" }}>
                {allMedia
                  .filter((m) => !tour.imageUrls.includes(m.originalUrl))
                  .map((m) => (
                    <div key={m.id} style={{ cursor: "pointer", borderRadius: 8, overflow: "hidden", border: "1px solid #e5e7eb" }}
                      onClick={() => handlePickCover(m.originalUrl)}>
                      <img src={m.thumbnailUrl} alt={m.filename} style={{ width: "100%", height: 100, objectFit: "cover" }} />
                      <p style={{ fontSize: 11, padding: "4px 6px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.filename}</p>
                    </div>
                  ))}
              </div>
            )}
            <div style={{ marginTop: 16 }}>
              <button className="btn btn-ghost" onClick={() => setShowCoverPicker(false)}>{t("common.cancel")}</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
