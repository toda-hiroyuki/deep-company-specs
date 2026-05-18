"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, statusBadgeClass, statusLabel, formatDateTime } from "@/lib/client-auth";
import { useI18n } from "@/lib/i18n";

interface Assignment {
  id: string;
  status: string;
  assignedAt: string;
  booking: {
    id: string;
    numberOfGuests: number;
    status: string;
    travelerName: string;
  };
  tour: { title: string };
  schedule: { startDateTime: string; meetingPointName: string };
}

const TABS = ["PENDING", "ACCEPTED", "ALL"];

export default function GuideAssignmentsPage() {
  const { loading: authLoading, authFetch } = useAuth("guide");
  const { t } = useI18n();
  const router = useRouter();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [tab, setTab] = useState("PENDING");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    loadAssignments();
  }, [authLoading, tab]);

  async function loadAssignments() {
    try {
      setLoading(true);
      const q = tab === "ALL" ? "" : `?status=${tab}`;
      const data = await authFetch(`/guide/assignments${q}`);
      setAssignments(data.assignments);
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  }

  if (authLoading) return <div className="loading">Loading...</div>;

  return (
    <div>
      <h1 className="page-title">My Assignments</h1>

      <div className="tab-bar">
        {TABS.map((t) => (
          <button
            key={t}
            className={`tab ${tab === t ? "active" : ""}`}
            onClick={() => setTab(t)}
          >
            {t === "ALL" ? "All" : t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading">Loading...</div>
      ) : assignments.length === 0 ? (
        <p className="text-muted" style={{ padding: 20, textAlign: "center" }}>
          No assignments found.
        </p>
      ) : (
        assignments.map((a) => (
          <div
            key={a.id}
            className="card"
            style={{ cursor: "pointer" }}
            onClick={() => router.push(`/guide/assignments/${a.id}`)}
          >
            <div className="flex justify-between items-center mb-2">
              <strong style={{ fontSize: 16 }}>{a.tour.title}</strong>
              <span className={statusBadgeClass(a.status)}>{statusLabel(a.status, t)}</span>
            </div>
            <div className="text-sm text-muted">
              {formatDateTime(a.schedule.startDateTime)} · {a.schedule.meetingPointName}
            </div>
            <div className="text-sm text-muted">
              {a.booking.travelerName} · {a.booking.numberOfGuests} guest{a.booking.numberOfGuests > 1 ? "s" : ""}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
