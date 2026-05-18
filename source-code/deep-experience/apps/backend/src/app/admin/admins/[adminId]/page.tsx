"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/lib/client-auth";
import { useI18n } from "@/lib/i18n";

interface Admin {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export default function AdminDetailPage() {
  const { loading: authLoading, authFetch } = useAuth("admin");
  const { t } = useI18n();
  const router = useRouter();
  const params = useParams();
  const adminId = params.adminId as string;

  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);

  // Profile edit
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [saveError, setSaveError] = useState("");

  // Password change
  const [newPassword, setNewPassword] = useState("");
  const [changingPw, setChangingPw] = useState(false);
  const [pwMsg, setPwMsg] = useState("");
  const [pwError, setPwError] = useState("");

  // Delete
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    if (authLoading) return;
    loadAdmin();
  }, [authLoading]);

  async function loadAdmin() {
    try {
      setLoading(true);
      const data = await authFetch(`/admin/admins/${adminId}`);
      setAdmin(data);
      setEditName(data.name);
      setEditEmail(data.email);
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveMsg("");
    setSaveError("");
    try {
      const data = await authFetch(`/admin/admins/${adminId}`, {
        method: "PUT",
        body: JSON.stringify({ name: editName, email: editEmail }),
      });
      setAdmin(data);
      setSaveMsg(t("tour.saved"));
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setChangingPw(true);
    setPwMsg("");
    setPwError("");
    try {
      await authFetch(`/admin/admins/${adminId}/password`, {
        method: "PUT",
        body: JSON.stringify({ newPassword }),
      });
      setPwMsg(t("adminDetail.passwordChanged"));
      setNewPassword("");
    } catch (err) {
      setPwError(err instanceof Error ? err.message : "Failed");
    } finally {
      setChangingPw(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setDeleteError("");
    try {
      await authFetch(`/admin/admins/${adminId}`, { method: "DELETE" });
      router.push("/admin/admins");
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed");
      setShowDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  }

  if (authLoading || loading) {
    return <div className="loading">{t("common.loading")}</div>;
  }

  if (!admin) {
    return <div>Admin not found</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{t("adminDetail.title")}</h1>
        <button
          className="btn btn-ghost"
          onClick={() => router.push("/admin/admins")}
        >
          {t("adminDetail.back")}
        </button>
      </div>

      {/* Profile Edit Section */}
      <div className="card">
        <h2 style={{ fontSize: 16, fontWeight: "bold", marginBottom: 16 }}>
          {t("adminDetail.editProfile")}
        </h2>
        {saveError && <p className="form-error mb-2">{saveError}</p>}
        {saveMsg && (
          <p style={{ color: "#10b981", marginBottom: 8 }}>{saveMsg}</p>
        )}
        <form onSubmit={handleSaveProfile}>
          <div className="form-group">
            <label className="form-label">{t("admins.name")}</label>
            <input
              className="form-input"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">{t("admins.email")}</label>
            <input
              className="form-input"
              type="email"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving}
          >
            {saving ? t("tour.saving") : t("common.save")}
          </button>
        </form>
      </div>

      {/* Password Change Section */}
      <div className="card">
        <h2 style={{ fontSize: 16, fontWeight: "bold", marginBottom: 16 }}>
          {t("adminDetail.changePassword")}
        </h2>
        {pwError && <p className="form-error mb-2">{pwError}</p>}
        {pwMsg && (
          <p style={{ color: "#10b981", marginBottom: 8 }}>{pwMsg}</p>
        )}
        <form onSubmit={handleChangePassword}>
          <div className="form-group">
            <label className="form-label">
              {t("adminDetail.newPassword")}
            </label>
            <input
              className="form-input"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={changingPw}
          >
            {changingPw
              ? t("tour.saving")
              : t("adminDetail.confirmChange")}
          </button>
        </form>
      </div>

      {/* Delete Section */}
      <div className="card" style={{ border: "1px solid #dc2626" }}>
        <h2 style={{ fontSize: 16, fontWeight: "bold", marginBottom: 16, color: "#dc2626" }}>
          {t("adminDetail.deleteAdmin")}
        </h2>
        {deleteError && <p className="form-error mb-2">{deleteError}</p>}
        {!showDeleteConfirm ? (
          <button
            className="btn"
            style={{
              background: "#dc2626",
              color: "white",
              border: "none",
            }}
            onClick={() => setShowDeleteConfirm(true)}
          >
            {t("adminDetail.deleteAdmin")}
          </button>
        ) : (
          <div>
            <p style={{ color: "#dc2626", marginBottom: 12 }}>
              {t("admins.deleteConfirm")}
            </p>
            <div className="flex gap-2">
              <button
                className="btn"
                style={{
                  background: "#dc2626",
                  color: "white",
                  border: "none",
                }}
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? "..." : t("common.delete")}
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => setShowDeleteConfirm(false)}
              >
                {t("common.cancel")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
