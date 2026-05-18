"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth, formatDateTime } from "@/lib/client-auth";
import { useI18n } from "@/lib/i18n";

interface GuestDetail {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  nationality: string | null;
  language: string | null;
  isActive: boolean;
  createdAt: string;
  bookings: {
    id: string;
    status: string;
    numberOfGuests: number;
    createdAt: string;
    tourSchedule: {
      startDateTime: string;
      tour: { titleEn: string };
    };
  }[];
}

export default function AdminGuestDetailPage() {
  const { loading: authLoading, authFetch } = useAuth("admin");
  const { t } = useI18n();
  const router = useRouter();
  const params = useParams();
  const guestId = params.guestId as string;

  const [guest, setGuest] = useState<GuestDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit state
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editNationality, setEditNationality] = useState("");
  const [editLanguage, setEditLanguage] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [saveError, setSaveError] = useState("");

  // Password reset state
  const [pwOpen, setPwOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState("");
  const [pwError, setPwError] = useState("");

  useEffect(() => {
    if (authLoading) return;
    loadGuest();
  }, [authLoading]);

  async function loadGuest() {
    try {
      setLoading(true);
      const data = await authFetch(`/admin/guests/${guestId}`);
      setGuest(data.guest);
      setEditFirstName(data.guest.firstName);
      setEditLastName(data.guest.lastName);
      setEditNationality(data.guest.nationality || "");
      setEditLanguage(data.guest.language || "");
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveMsg("");
    setSaveError("");
    try {
      const data = await authFetch(`/admin/guests/${guestId}`, {
        method: "PUT",
        body: JSON.stringify({
          firstName: editFirstName,
          lastName: editLastName,
          nationality: editNationality || null,
          language: editLanguage || null,
        }),
      });
      setGuest((prev) => prev ? { ...prev, ...data.guest } : prev);
      setSaveMsg(t("tour.saved"));
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordReset(e: React.FormEvent) {
    e.preventDefault();
    setPwSaving(true);
    setPwMsg("");
    setPwError("");
    try {
      await authFetch(`/admin/guests/${guestId}/password`, {
        method: "PUT",
        body: JSON.stringify({ newPassword }),
      });
      setPwMsg(t("guestDetail.passwordChanged"));
      setNewPassword("");
      setPwOpen(false);
    } catch (err) {
      setPwError(err instanceof Error ? err.message : "Failed");
    } finally {
      setPwSaving(false);
    }
  }

  async function toggleActive() {
    if (!guest) return;
    try {
      const data = await authFetch(`/admin/guests/${guestId}`, {
        method: "PUT",
        body: JSON.stringify({ isActive: !guest.isActive }),
      });
      setGuest((prev) => prev ? { ...prev, isActive: data.guest.isActive } : prev);
    } catch {
      // handled
    }
  }

  if (authLoading || loading) {
    return <div className="loading">{t("common.loading")}</div>;
  }

  if (!guest) {
    return <div>Guest not found</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{t("guestDetail.title")}</h1>
        <button className="btn btn-ghost" onClick={() => router.push("/admin/guests")}>
          {t("guestDetail.back")}
        </button>
      </div>

      {/* Profile Edit */}
      <div className="card">
        <h2 style={{ fontSize: 16, fontWeight: "bold", marginBottom: 16 }}>
          {t("guestDetail.editProfile")}
        </h2>
        {saveError && <p className="form-error mb-2">{saveError}</p>}
        {saveMsg && <p style={{ color: "#10b981", marginBottom: 8 }}>{saveMsg}</p>}
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">{t("guestDetail.email")}</label>
            <input className="form-input" value={guest.email} disabled style={{ opacity: 0.6 }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="form-group">
              <label className="form-label">{t("guestDetail.lastName")}</label>
              <input className="form-input" value={editLastName} onChange={(e) => setEditLastName(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">{t("guestDetail.firstName")}</label>
              <input className="form-input" value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} required />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="form-group">
              <label className="form-label">{t("guestDetail.nationality")}</label>
              <input className="form-input" value={editNationality} onChange={(e) => setEditNationality(e.target.value)} placeholder="JP, US, ..." />
            </div>
            <div className="form-group">
              <label className="form-label">{t("guestDetail.language")}</label>
              <input className="form-input" value={editLanguage} onChange={(e) => setEditLanguage(e.target.value)} placeholder="ja, en, ..." />
            </div>
          </div>
          <div className="flex gap-2" style={{ marginTop: 12 }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? t("tour.saving") : t("common.save")}
            </button>
            <button type="button" className={`btn ${guest.isActive ? "btn-ghost" : "btn-primary"}`} onClick={toggleActive}>
              {guest.isActive ? t("guestDetail.deactivate") : t("guestDetail.activate")}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => { setPwOpen((v) => !v); setPwError(""); setPwMsg(""); }}>
              {t("guestDetail.changePassword")}
            </button>
          </div>
        </form>

        {pwOpen && (
          <form onSubmit={handlePasswordReset} style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #e5e7eb" }}>
            <h3 style={{ fontSize: 14, fontWeight: "bold", marginBottom: 8 }}>{t("guestDetail.changePassword")}</h3>
            {pwError && <p className="form-error mb-2">{pwError}</p>}
            <div className="form-group">
              <label className="form-label">{t("guestDetail.newPassword")}</label>
              <input type="password" className="form-input" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={8} required autoComplete="new-password" />
              <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>{t("guestDetail.passwordHint")}</div>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary" disabled={pwSaving}>
                {pwSaving ? t("tour.saving") : t("common.save")}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => { setPwOpen(false); setNewPassword(""); setPwError(""); }}>
                {t("common.cancel")}
              </button>
            </div>
          </form>
        )}
        {pwMsg && <p style={{ color: "#10b981", marginTop: 8 }}>{pwMsg}</p>}

        <div style={{ marginTop: 12, fontSize: 13, color: "#888" }}>
          {t("guestDetail.registeredAt")}: {formatDateTime(guest.createdAt)}
        </div>
      </div>

      {/* Booking History */}
      <div className="card">
        <h2 style={{ fontSize: 16, fontWeight: "bold", marginBottom: 16 }}>
          {t("guestDetail.bookingHistory")} ({guest.bookings.length})
        </h2>
        {guest.bookings.length === 0 ? (
          <p style={{ color: "#888" }}>{t("guestDetail.noBookings")}</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>{t("guestDetail.tour")}</th>
                <th>{t("guestDetail.date")}</th>
                <th>{t("bookings.guests")}</th>
                <th>{t("common.status")}</th>
              </tr>
            </thead>
            <tbody>
              {guest.bookings.map((b) => (
                <tr key={b.id} style={{ cursor: "pointer" }} onClick={() => router.push(`/admin/bookings/${b.id}`)}>
                  <td>{b.tourSchedule.tour.titleEn}</td>
                  <td>{formatDateTime(b.tourSchedule.startDateTime)}</td>
                  <td>{b.numberOfGuests}</td>
                  <td>{b.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
