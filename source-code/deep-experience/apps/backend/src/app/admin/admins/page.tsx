"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/client-auth";
import { useI18n } from "@/lib/i18n";

interface Admin {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export default function AdminAdminsPage() {
  const { loading: authLoading, authFetch } = useAuth("admin");
  const { t } = useI18n();
  const router = useRouter();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (authLoading) return;
    loadAdmins();
  }, [authLoading]);

  async function loadAdmins() {
    try {
      setLoading(true);
      const data = await authFetch("/admin/admins");
      setAdmins(data.admins);
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
      await authFetch("/admin/admins", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
        }),
      });
      setShowNew(false);
      setForm({ name: "", email: "", password: "" });
      await loadAdmins();
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
        <h1 className="page-title">{t("admins.title")}</h1>
        <button className="btn btn-primary" onClick={() => setShowNew(true)}>
          {t("admins.new")}
        </button>
      </div>

      {loading ? (
        <div className="loading">{t("common.loading")}</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>{t("admins.name")}</th>
              <th>{t("admins.email")}</th>
              <th>{t("admins.createdAt")}</th>
            </tr>
          </thead>
          <tbody>
            {admins.map((a) => (
              <tr
                key={a.id}
                style={{ cursor: "pointer" }}
                onClick={() => router.push(`/admin/admins/${a.id}`)}
              >
                <td>
                  <strong>{a.name}</strong>
                </td>
                <td>{a.email}</td>
                <td>{new Date(a.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showNew && (
        <div className="modal-overlay" onClick={() => setShowNew(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3
              style={{ fontSize: 18, fontWeight: "bold", marginBottom: 16 }}
            >
              {t("adminForm.title")}
            </h3>
            {formError && <p className="form-error mb-2">{formError}</p>}
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label className="form-label">{t("adminForm.name")}</label>
                <input
                  className="form-input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">{t("adminForm.email")}</label>
                <input
                  className="form-input"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">
                  {t("adminForm.password")}
                </label>
                <input
                  className="form-input"
                  type="password"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  required
                />
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={creating}
                >
                  {creating ? t("adminForm.creating") : t("adminForm.create")}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowNew(false)}
                >
                  {t("common.cancel")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
