"use client";

import { useCallback, useEffect, useState } from "react";

interface BookingSummary {
  bookingId: string;
  travelerName: string;
  headcount: number;
  status: string;
}

interface ScheduleRow {
  scheduleId: string;
  tourId: string;
  startDateTime: string;
  endDateTime: string;
  initialCapacity: number;
  currentHeadcount: number;
  remainingCapacity: number;
  bookingCount: number;
  status: string;
  sourceRuleId: string | null;
  bookings: BookingSummary[];
}

interface Props {
  tourId: string;
  authFetch: (path: string, options?: RequestInit) => Promise<unknown>;
  freeCancellationDeadlineHours: number | null;
  bookingCutoffMinutes: number | null;
}

const jstFormatter = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function formatJst(iso: string): string {
  return jstFormatter.format(new Date(iso));
}

function formatFinalizeAt(iso: string, hours: number): string {
  const deadline = new Date(new Date(iso).getTime() - hours * 60 * 60 * 1000);
  return jstFormatter.format(deadline);
}

function formatBookingCutoffAt(iso: string, minutes: number): string {
  const deadline = new Date(new Date(iso).getTime() - minutes * 60 * 1000);
  return jstFormatter.format(deadline);
}

const STATUS_OPTIONS = [
  { value: "", label: "すべて" },
  { value: "OPEN", label: "OPEN" },
  { value: "FULL", label: "FULL" },
  { value: "CANCELLED", label: "CANCELLED" },
  { value: "COMPLETED", label: "COMPLETED" },
];

export default function ScheduleList({ tourId, authFetch, freeCancellationDeadlineHours, bookingCutoffMinutes }: Props) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState("");
  const [zeroBookings, setZeroBookings] = useState(false);
  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (from) qs.set("from", from);
      if (to) qs.set("to", to);
      if (status) qs.set("status", status);
      if (zeroBookings) qs.set("zeroBookings", "true");
      const q = qs.toString();
      const path = `/admin/tours/${tourId}/schedules${q ? `?${q}` : ""}`;
      const data = (await authFetch(path)) as { schedules: ScheduleRow[] };
      setSchedules(data.schedules || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [tourId, from, to, status, zeroBookings, authFetch]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCancel(row: ScheduleRow) {
    if (
      !window.confirm(
        `この催行回を無効化しますか？\n${formatJst(row.startDateTime)}（予約 ${row.bookingCount} 件）`
      )
    ) {
      return;
    }
    try {
      await authFetch(`/admin/schedules/${row.scheduleId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "CANCELLED" }),
      });
      await load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      window.alert(
        msg.includes("CONFLICT")
          ? "予約が残っているため無効化できません"
          : `無効化に失敗しました: ${msg}`
      );
    }
  }

  return (
    <div>
      <h2 style={{ fontSize: 16, fontWeight: "bold", marginBottom: 12 }}>
        ● 催行回一覧
      </h2>
      <div
        className="card"
        style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 12 }}
      >
        <label style={{ display: "flex", flexDirection: "column", fontSize: 12 }}>
          開始日（JST, from）
          <input
            type="date"
            className="form-input"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            style={{ fontSize: 13 }}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", fontSize: 12 }}>
          開始日（JST, to）
          <input
            type="date"
            className="form-input"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            style={{ fontSize: 13 }}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", fontSize: 12 }}>
          ステータス
          <select
            className="form-select"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            style={{ fontSize: 13 }}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
          <input
            type="checkbox"
            checked={zeroBookings}
            onChange={(e) => setZeroBookings(e.target.checked)}
          />
          予約0件のみ
        </label>
        <button className="btn btn-ghost btn-sm" onClick={load} disabled={loading}>
          {loading ? "読込中..." : "再読込"}
        </button>
      </div>

      {error && (
        <p style={{ color: "#ef4444", fontSize: 13, marginBottom: 8 }}>{error}</p>
      )}

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #e5e7eb", background: "#f9fafb" }}>
              <th style={{ textAlign: "left", padding: "8px 10px" }}>開始日時 (JST)</th>
              <th style={{ textAlign: "left", padding: "8px 10px" }}>終了日時 (JST)</th>
              <th style={{ textAlign: "right", padding: "8px 10px" }}>
                初期 / 現在 / 残席
              </th>
              <th style={{ textAlign: "right", padding: "8px 10px" }}>予約件数</th>
              <th style={{ textAlign: "left", padding: "8px 10px" }}>ステータス</th>
              <th style={{ textAlign: "right", padding: "8px 10px" }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {schedules.length === 0 && !loading && (
              <tr>
                <td colSpan={6} style={{ padding: "16px 10px", textAlign: "center", color: "#6b7280" }}>
                  該当する催行回がありません
                </td>
              </tr>
            )}
            {schedules.map((row) => {
              const canCancel =
                row.bookingCount === 0 && row.status !== "CANCELLED";
              const disabledReason =
                row.status === "CANCELLED"
                  ? "既に無効化済みです"
                  : row.bookingCount > 0
                    ? "予約が紐づいています"
                    : undefined;
              return (
                <tr key={row.scheduleId} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "8px 10px" }}>
                    {formatJst(row.startDateTime)}
                    {bookingCutoffMinutes !== null && (
                      <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
                        予約受付締切: {formatBookingCutoffAt(row.startDateTime, bookingCutoffMinutes)}
                      </div>
                    )}
                    {freeCancellationDeadlineHours !== null && (
                      <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
                        無料キャンセル締切: {formatFinalizeAt(row.startDateTime, freeCancellationDeadlineHours)}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: "8px 10px" }}>{formatJst(row.endDateTime)}</td>
                  <td style={{ padding: "8px 10px", textAlign: "right" }}>
                    {row.initialCapacity} / {row.currentHeadcount} / {row.remainingCapacity}
                  </td>
                  <td style={{ padding: "8px 10px", textAlign: "right" }}>{row.bookingCount}</td>
                  <td style={{ padding: "8px 10px" }}>
                    <span
                      className={
                        row.status === "CANCELLED"
                          ? "badge badge-cancelled"
                          : row.status === "FULL"
                            ? "badge badge-accepted"
                            : "badge badge-open"
                      }
                      style={{ fontSize: 12 }}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td style={{ padding: "8px 10px", textAlign: "right" }}>
                    <button
                      className="btn btn-sm"
                      onClick={() => handleCancel(row)}
                      disabled={!canCancel}
                      title={disabledReason}
                      style={{ fontSize: 12 }}
                    >
                      無効化
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
