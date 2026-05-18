"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/client-auth";
import { useI18n } from "@/lib/i18n";

interface Spot {
  id: string;
  name: string;
  nameEn: string;
  imageUrls: string[];
  locationName: string;
  category: string;
  isActive: boolean;
  tourCount: number;
  updatedAt: string;
}

export default function AdminSpotsPage() {
  const { loading: authLoading, authFetch } = useAuth("admin");
  const router = useRouter();
  const { t } = useI18n();
  const [spots, setSpots] = useState<Spot[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showNew, setShowNew] = useState(false);

  // New spot form
  const [form, setForm] = useState({
    name: "", nameEn: "", description: "", descriptionEn: "",
    lat: "", lng: "", locationName: "", category: "",
  });
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (authLoading) return;
    loadSpots();
  }, [authLoading]);

  async function loadSpots() {
    try {
      setLoading(true);
      const data = await authFetch("/admin/spots");
      setSpots(data.spots);
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
      await authFetch("/admin/spots", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          lat: parseFloat(form.lat),
          lng: parseFloat(form.lng),
        }),
      });
      setShowNew(false);
      setForm({ name: "", nameEn: "", description: "", descriptionEn: "", lat: "", lng: "", locationName: "", category: "" });
      await loadSpots();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed");
    } finally {
      setCreating(false);
    }
  }

  const filtered = spots.filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return s.name.toLowerCase().includes(q)
      || s.nameEn.toLowerCase().includes(q)
      || s.category.toLowerCase().includes(q)
      || s.locationName.toLowerCase().includes(q);
  });

  if (authLoading) return <div className="loading">{t("common.loading")}</div>;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">スポット管理</h1>
        <button className="btn btn-primary" onClick={() => setShowNew(true)}>新規作成</button>
      </div>

      {/* Search & filter bar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
        <input
          className="form-input"
          placeholder="名称・カテゴリ・場所で検索..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 320, flex: 1 }}
        />
        <span className="text-sm text-muted">
          {filtered.length} / {spots.length} 件
        </span>
        <button className="btn btn-ghost btn-sm" title="CSV export (stub)" style={{ marginLeft: "auto" }}>
          CSV出力
        </button>
      </div>

      {loading ? (
        <div className="loading">{t("common.loading")}</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th style={{ width: 40 }}>No</th>
              <th style={{ width: 60 }}></th>
              <th>名称</th>
              <th>場所</th>
              <th>カテゴリ</th>
              <th>{t("common.status")}</th>
              <th>関連ツアー数</th>
              <th>最終更新</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((spot, i) => (
              <tr key={spot.id} onClick={() => router.push(`/admin/spots/${spot.id}`)}>
                <td className="text-muted text-sm">{i + 1}</td>
                <td style={{ padding: 4 }}>
                  {(() => {
                    const urls = typeof spot.imageUrls === "string" ? JSON.parse(spot.imageUrls) : spot.imageUrls;
                    return urls?.[0] ? (
                      <img src={urls[0]} alt="" style={{ width: 56, height: 40, objectFit: "cover", borderRadius: 4 }} />
                    ) : (
                      <div style={{ width: 56, height: 40, backgroundColor: "#f3f4f6", borderRadius: 4 }} />
                    );
                  })()}
                </td>
                <td>
                  <strong>{spot.name}</strong>
                  <br />
                  <span className="text-sm text-muted">{spot.nameEn}</span>
                </td>
                <td className="text-sm">{spot.locationName}</td>
                <td className="text-sm">{spot.category}</td>
                <td>
                  {spot.isActive
                    ? <span className="badge badge-accepted">{t("common.active")}</span>
                    : <span className="badge badge-cancelled">{t("common.inactive")}</span>
                  }
                </td>
                <td className="text-center">{spot.tourCount ?? 0}</td>
                <td className="text-sm text-muted">
                  {new Date(spot.updatedAt).toLocaleString("ja-JP", {
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
            <h3 style={{ fontSize: 18, fontWeight: "bold", marginBottom: 16 }}>新規スポット作成</h3>
            {formError && <p className="form-error mb-2">{formError}</p>}
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label className="form-label">名称（日本語）</label>
                <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">名称（英語）</label>
                <input className="form-input" value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">説明（日本語）</label>
                <textarea className="form-textarea" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">説明（英語）</label>
                <textarea className="form-textarea" value={form.descriptionEn} onChange={(e) => setForm({ ...form, descriptionEn: e.target.value })} required />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">緯度 (Lat)</label>
                  <input className="form-input" type="number" step="any" value={form.lat} onChange={(e) => setForm({ ...form, lat: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">経度 (Lng)</label>
                  <input className="form-input" type="number" step="any" value={form.lng} onChange={(e) => setForm({ ...form, lng: e.target.value })} required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">所在地名</label>
                <input className="form-input" value={form.locationName} onChange={(e) => setForm({ ...form, locationName: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">カテゴリ</label>
                <input className="form-input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required />
              </div>
              <div className="flex gap-2 mt-4">
                <button type="submit" className="btn btn-primary" disabled={creating}>
                  {creating ? "作成中..." : "作成"}
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
