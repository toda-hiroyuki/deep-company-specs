"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, formatPrice } from "@/lib/client-auth";
import { useI18n } from "@/lib/i18n";

interface Tour {
  id: string;
  title: string;
  titleEn: string;
  tourType: string;
  category: string;
  pricePerPersonCents: number;
  maxParticipants: number;
  meetingPointName: string;
  imageUrls: string[];
  isActive: boolean;
  schedulesCount: number;
  updatedAt: string;
}

export default function AdminToursPage() {
  const { loading: authLoading, authFetch } = useAuth("admin");
  const router = useRouter();
  const { t } = useI18n();
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showNew, setShowNew] = useState(false);

  // New tour form
  const [form, setForm] = useState({
    title: "", titleEn: "", description: "", descriptionEn: "",
    meetingPointLat: "", meetingPointLng: "", meetingPointName: "",
    durationMinutes: "", pricePerPersonCents: "", maxParticipants: "",
    tourType: "GROUP", category: "",
  });
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (authLoading) return;
    loadTours();
  }, [authLoading]);

  async function loadTours() {
    try {
      setLoading(true);
      const data = await authFetch("/admin/tours");
      setTours(data.tours);
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setFormError("");
    try {
      await authFetch("/admin/tours", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          meetingPointLat: parseFloat(form.meetingPointLat),
          meetingPointLng: parseFloat(form.meetingPointLng),
          durationMinutes: parseInt(form.durationMinutes),
          pricePerPersonCents: parseInt(form.pricePerPersonCents),
          maxParticipants: parseInt(form.maxParticipants),
        }),
      });
      setShowNew(false);
      setForm({ title: "", titleEn: "", description: "", descriptionEn: "", meetingPointLat: "", meetingPointLng: "", meetingPointName: "", durationMinutes: "", pricePerPersonCents: "", maxParticipants: "", tourType: "GROUP", category: "" });
      await loadTours();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed");
    } finally {
      setCreating(false);
    }
  }

  const filtered = tours.filter((t) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return t.title.toLowerCase().includes(q)
      || t.titleEn.toLowerCase().includes(q)
      || t.category.toLowerCase().includes(q)
      || t.meetingPointName.toLowerCase().includes(q);
  });

  if (authLoading) return <div className="loading">{t("common.loading")}</div>;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{t("tours.title")}</h1>
        <button className="btn btn-primary" onClick={() => setShowNew(true)}>{t("tours.new")}</button>
      </div>

      {/* Search & filter bar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
        <input
          className="form-input"
          placeholder={t("tours.searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 320, flex: 1 }}
        />
        <span className="text-sm text-muted">
          {t("tours.count", { filtered: filtered.length, total: tours.length })}
        </span>
        <button className="btn btn-ghost btn-sm" title="CSV export (stub)" style={{ marginLeft: "auto" }}>
          {t("tours.csvExport")}
        </button>
      </div>

      {loading ? (
        <div className="loading">{t("common.loading")}</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th style={{ width: 40 }}>{t("tours.no")}</th>
              <th style={{ width: 60 }}></th>
              <th>{t("tours.tourName")}</th>
              <th>{t("tours.meetingPoint")}</th>
              <th>{t("tours.type")}</th>
              <th>{t("tours.category")}</th>
              <th>{t("tours.price")}</th>
              <th>{t("tours.capacity")}</th>
              <th>{t("tours.schedules")}</th>
              <th>{t("common.status")}</th>
              <th>{t("tours.lastUpdated")}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((tour, i) => (
              <tr key={tour.id} onClick={() => router.push(`/admin/tours/${tour.id}`)}>
                <td className="text-muted text-sm">{i + 1}</td>
                <td style={{ padding: 4 }}>
                  {tour.imageUrls?.[0] ? (
                    <img src={tour.imageUrls[0]} alt="" style={{ width: 56, height: 40, objectFit: "cover", borderRadius: 4 }} />
                  ) : (
                    <div style={{ width: 56, height: 40, backgroundColor: "#f3f4f6", borderRadius: 4 }} />
                  )}
                </td>
                <td>
                  <strong>{tour.title}</strong>
                  <br />
                  <span className="text-sm text-muted">{tour.titleEn}</span>
                </td>
                <td className="text-sm">{tour.meetingPointName}</td>
                <td><span className="badge badge-open">{tour.tourType}</span></td>
                <td className="text-sm">{tour.category}</td>
                <td>{formatPrice(tour.pricePerPersonCents)}</td>
                <td className="text-center">{tour.maxParticipants}</td>
                <td className="text-center">{tour.schedulesCount}</td>
                <td>
                  {tour.isActive
                    ? <span className="badge badge-accepted">{t("common.active")}</span>
                    : <span className="badge badge-cancelled">{t("common.inactive")}</span>
                  }
                </td>
                <td className="text-sm text-muted">
                  {new Date(tour.updatedAt).toLocaleString("ja-JP", {
                    year: "numeric", month: "2-digit", day: "2-digit",
                    hour: "2-digit", minute: "2-digit",
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showNew && (
        <div className="modal-overlay" onClick={() => setShowNew(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: 18, fontWeight: "bold", marginBottom: 16 }}>{t("tourForm.title")}</h3>
            {formError && <p className="form-error mb-2">{formError}</p>}
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label className="form-label">{t("tourForm.titleJp")}</label>
                <input className="form-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">{t("tourForm.titleEn")}</label>
                <input className="form-input" value={form.titleEn} onChange={(e) => setForm({ ...form, titleEn: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">{t("tourForm.descJp")}</label>
                <textarea className="form-textarea" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">{t("tourForm.descEn")}</label>
                <textarea className="form-textarea" value={form.descriptionEn} onChange={(e) => setForm({ ...form, descriptionEn: e.target.value })} required />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">{t("tourForm.lat")}</label>
                  <input className="form-input" type="number" step="any" value={form.meetingPointLat} onChange={(e) => setForm({ ...form, meetingPointLat: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">{t("tourForm.lng")}</label>
                  <input className="form-input" type="number" step="any" value={form.meetingPointLng} onChange={(e) => setForm({ ...form, meetingPointLng: e.target.value })} required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">{t("tourForm.meetingPointName")}</label>
                <input className="form-input" value={form.meetingPointName} onChange={(e) => setForm({ ...form, meetingPointName: e.target.value })} required />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">{t("tourForm.duration")}</label>
                  <input className="form-input" type="number" value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">{t("tourForm.priceCents")}</label>
                  <input className="form-input" type="number" value={form.pricePerPersonCents} onChange={(e) => setForm({ ...form, pricePerPersonCents: e.target.value })} required />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">{t("tourForm.maxParticipants")}</label>
                  <input className="form-input" type="number" value={form.maxParticipants} onChange={(e) => setForm({ ...form, maxParticipants: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">{t("tourForm.type")}</label>
                  <select className="form-select" value={form.tourType} onChange={(e) => setForm({ ...form, tourType: e.target.value })}>
                    <option value="GROUP">GROUP</option>
                    <option value="PRIVATE">PRIVATE</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">{t("tourForm.category")}</label>
                <input className="form-input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required />
              </div>
              <div className="flex gap-2 mt-4">
                <button type="submit" className="btn btn-primary" disabled={creating}>
                  {creating ? t("tourForm.creating") : t("tourForm.create")}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setShowNew(false)}>{t("common.cancel")}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
