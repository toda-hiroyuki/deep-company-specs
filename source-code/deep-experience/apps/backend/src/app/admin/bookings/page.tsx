"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, statusBadgeClass, statusLabel, formatDateTime } from "@/lib/client-auth";
import { useI18n } from "@/lib/i18n";

interface Booking {
  id: string;
  status: string;
  assignmentState: string;
  travelerName: string;
  travelerEmail: string;
  numberOfGuests: number;
  createdAt: string;
  tour: { id: string; title: string };
  schedule: { id: string; startDateTime: string; meetingPointName: string };
  assignments: { id: string; status: string; guideName: string }[];
}

const STATUSES = ["ALL", "PENDING", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "EXPIRED"];

export default function AdminBookingsPage() {
  const { loading: authLoading, authFetch } = useAuth("admin");
  const router = useRouter();
  const { t } = useI18n();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    loadBookings();
  }, [authLoading, filter]);

  async function loadBookings() {
    try {
      setLoading(true);
      const q = filter === "ALL" ? "" : `?status=${filter}`;
      const data = await authFetch(`/admin/bookings${q}`);
      setBookings(data.bookings);
    } catch {
      // auth redirect handled by hook
    } finally {
      setLoading(false);
    }
  }

  if (authLoading) return <div className="loading">{t("common.loading")}</div>;

  return (
    <div>
      <h1 className="page-title">{t("bookings.title")}</h1>

      <div className="tab-bar">
        {STATUSES.map((s) => (
          <button
            key={s}
            className={`tab ${filter === s ? "active" : ""}`}
            onClick={() => setFilter(s)}
          >
            {s === "ALL" ? t("bookings.all") : statusLabel(s, t)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading">{t("common.loading")}</div>
      ) : bookings.length === 0 ? (
        <p className="text-muted" style={{ padding: 20 }}>{t("bookings.empty")}</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>{t("common.status")}</th>
              <th>{t("bookings.traveler")}</th>
              <th>{t("bookings.tour")}</th>
              <th>{t("bookings.date")}</th>
              <th>{t("bookings.guests")}</th>
              <th>{t("bookings.guide")}</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => {
              const accepted = b.assignments.find((a) => a.status === "ACCEPTED");
              const pending = b.assignments.find((a) => a.status === "PENDING");
              return (
                <tr key={b.id} onClick={() => router.push(`/admin/bookings/${b.id}`)}>
                  <td>
                    <span className={statusBadgeClass(b.status)}>{statusLabel(b.status, t)}</span>
                    {b.assignmentState === "FINALIZED" && (
                      <span className="badge badge-finalized" style={{ marginLeft: 4 }}>
                        {t("bookings.finalizedBadge")}
                      </span>
                    )}
                  </td>
                  <td>{b.travelerName}</td>
                  <td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.tour.title}</td>
                  <td>{formatDateTime(b.schedule.startDateTime)}</td>
                  <td>{b.numberOfGuests}</td>
                  <td>
                    {accepted ? (
                      <span className="badge badge-accepted">{accepted.guideName}</span>
                    ) : pending ? (
                      <span className="badge badge-pending">{t("bookings.pending", { name: pending.guideName })}</span>
                    ) : (
                      <span className="text-muted text-sm">{t("bookings.unassigned")}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
