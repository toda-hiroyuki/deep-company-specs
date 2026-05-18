"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/client-auth";
import { useI18n } from "@/lib/i18n";

interface Guide {
  id: string;
  email: string;
  name: string;
  languages: string[];
  areas: string[];
  isActive: boolean;
}

export default function AdminGuidesPage() {
  const { loading: authLoading, authFetch } = useAuth("admin");
  const { t } = useI18n();
  const [guides, setGuides] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", bio: "", languages: "", areas: "" });
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (authLoading) return;
    loadGuides();
  }, [authLoading]);

  async function loadGuides() {
    try {
      setLoading(true);
      const data = await authFetch("/admin/guides");
      setGuides(data.guides);
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
      await authFetch("/admin/guides", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          bio: form.bio || undefined,
          languages: form.languages ? form.languages.split(",").map((s) => s.trim()) : [],
          areas: form.areas ? form.areas.split(",").map((s) => s.trim()) : [],
        }),
      });
      setShowNew(false);
      setForm({ name: "", email: "", password: "", bio: "", languages: "", areas: "" });
      await loadGuides();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed");
    } finally {
      setCreating(false);
    }
  }

  if (authLoading) return <div className="loading">{t("common.loading")}</div>;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{t("guides.title")}</h1>
        <button className="btn btn-primary" onClick={() => setShowNew(true)}>{t("guides.new")}</button>
      </div>

      {loading ? (
        <div className="loading">{t("common.loading")}</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>{t("guides.name")}</th>
              <th>{t("guides.email")}</th>
              <th>{t("guides.languages")}</th>
              <th>{t("guides.areas")}</th>
              <th>{t("guides.active")}</th>
            </tr>
          </thead>
          <tbody>
            {guides.map((g) => (
              <tr key={g.id} style={{ cursor: "default" }}>
                <td><strong>{g.name}</strong></td>
                <td>{g.email}</td>
                <td>{g.languages.join(", ")}</td>
                <td>{g.areas.join(", ")}</td>
                <td>{g.isActive ? t("common.yes") : t("common.no")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showNew && (
        <div className="modal-overlay" onClick={() => setShowNew(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: 18, fontWeight: "bold", marginBottom: 16 }}>{t("guideForm.title")}</h3>
            {formError && <p className="form-error mb-2">{formError}</p>}
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label className="form-label">{t("guideForm.name")}</label>
                <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">{t("guideForm.email")}</label>
                <input className="form-input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">{t("guideForm.password")}</label>
                <input className="form-input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">{t("guideForm.bio")}</label>
                <textarea className="form-textarea" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">{t("guideForm.languages")}</label>
                <input className="form-input" value={form.languages} onChange={(e) => setForm({ ...form, languages: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">{t("guideForm.areas")}</label>
                <input className="form-input" value={form.areas} onChange={(e) => setForm({ ...form, areas: e.target.value })} />
              </div>
              <div className="flex gap-2 mt-4">
                <button type="submit" className="btn btn-primary" disabled={creating}>
                  {creating ? t("guideForm.creating") : t("guideForm.create")}
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
