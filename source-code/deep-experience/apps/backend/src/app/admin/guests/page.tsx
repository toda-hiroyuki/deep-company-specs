"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, formatDateTime } from "@/lib/client-auth";
import { useI18n } from "@/lib/i18n";

interface Guest {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  nationality: string | null;
  language: string | null;
  isActive: boolean;
  createdAt: string;
  _count: { bookings: number };
}

export default function AdminGuestsPage() {
  const { loading: authLoading, authFetch } = useAuth("admin");
  const { t } = useI18n();
  const router = useRouter();
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    loadGuests();
  }, [authLoading]);

  async function loadGuests() {
    try {
      setLoading(true);
      const data = await authFetch("/admin/guests");
      setGuests(data.guests);
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(guestId: string, isActive: boolean) {
    try {
      await authFetch(`/admin/guests/${guestId}`, {
        method: "PUT",
        body: JSON.stringify({ isActive: !isActive }),
      });
      await loadGuests();
    } catch {
      // handled
    }
  }

  if (authLoading) return <div className="loading">{t("common.loading")}</div>;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{t("guests.title")}</h1>
        <span style={{ fontSize: 14, color: "#666" }}>
          {guests.length} {t("guests.total")}
        </span>
      </div>

      {loading ? (
        <div className="loading">{t("common.loading")}</div>
      ) : guests.length === 0 ? (
        <div className="empty-state">{t("guests.empty")}</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>{t("guests.name")}</th>
              <th>{t("guests.email")}</th>
              <th>{t("guests.nationality")}</th>
              <th>{t("guests.bookings")}</th>
              <th>{t("guests.registered")}</th>
              <th>{t("guests.active")}</th>
            </tr>
          </thead>
          <tbody>
            {guests.map((g) => (
              <tr key={g.id} style={{ cursor: "pointer" }} onClick={() => router.push(`/admin/guests/${g.id}`)}>
                <td><strong>{g.lastName} {g.firstName}</strong></td>
                <td>{g.email}</td>
                <td>{g.nationality || "—"}</td>
                <td>{g._count.bookings}</td>
                <td>{formatDateTime(g.createdAt)}</td>
                <td>
                  <button
                    className={`btn btn-sm ${g.isActive ? "btn-success" : "btn-ghost"}`}
                    onClick={(e) => { e.stopPropagation(); toggleActive(g.id, g.isActive); }}
                    style={{ fontSize: 12, padding: "2px 8px" }}
                  >
                    {g.isActive ? t("common.active") : t("common.inactive")}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
