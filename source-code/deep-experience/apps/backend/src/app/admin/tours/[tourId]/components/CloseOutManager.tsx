"use client";

import { useState } from "react";

interface CloseOut {
  id: string;
  date: string;
  startTime: { hour: number; minute: number } | null;
  reason: string | null;
}

interface Props {
  date: Date | null;
  slots: { time: string; closedOut: boolean }[];
  closeOuts: CloseOut[];
  tourId: string;
  durationMinutes: number;
  authFetch: (path: string, options?: RequestInit) => Promise<any>;
  onRefresh: () => Promise<void>;
  onClose: () => void;
}

export default function CloseOutManager({
  date,
  slots,
  closeOuts,
  tourId,
  durationMinutes,
  authFetch,
  onRefresh,
  onClose,
}: Props) {
  const [reason, setReason] = useState("");
  const [adding, setAdding] = useState(false);
  const [manualTime, setManualTime] = useState("10:00");
  const [addingManual, setAddingManual] = useState(false);

  if (!date) return null;

  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const dateLabel = date.toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric", weekday: "short" });

  // Find close-outs for this date
  const dateCloseOuts = closeOuts.filter((co) => {
    const coDate = new Date(co.date).toISOString().split("T")[0];
    return coDate === dateStr;
  });

  const isAllClosed = dateCloseOuts.some((co) => !co.startTime);

  async function toggleCloseOut(time: string) {
    const [hourStr, minStr] = time.split(":");
    const hour = Number(hourStr);
    const minute = Number(minStr);

    // Find existing close-out for this time
    const existing = dateCloseOuts.find((co) => {
      if (!co.startTime) return false;
      return co.startTime.hour === hour && co.startTime.minute === minute;
    });

    try {
      if (existing) {
        // Remove close-out
        await authFetch(`/admin/tours/${tourId}/close-outs`, {
          method: "DELETE",
          body: JSON.stringify({ id: existing.id }),
        });
      } else {
        // Add close-out
        await authFetch(`/admin/tours/${tourId}/close-outs`, {
          method: "POST",
          body: JSON.stringify({
            date: dateStr,
            startTime: { hour, minute },
            reason: reason || null,
          }),
        });
      }
      await onRefresh();
    } catch {
      /* handled */
    }
  }

  async function toggleAllClosed() {
    try {
      if (isAllClosed) {
        // Remove the "all closed" close-out
        const allClosedCo = dateCloseOuts.find((co) => !co.startTime);
        if (allClosedCo) {
          await authFetch(`/admin/tours/${tourId}/close-outs`, {
            method: "DELETE",
            body: JSON.stringify({ id: allClosedCo.id }),
          });
        }
      } else {
        // Add "all closed" close-out
        await authFetch(`/admin/tours/${tourId}/close-outs`, {
          method: "POST",
          body: JSON.stringify({
            date: dateStr,
            startTime: null,
            reason: reason || null,
          }),
        });
      }
      await onRefresh();
    } catch {
      /* handled */
    }
  }

  async function handleAddManualSlot(e: React.FormEvent) {
    e.preventDefault();
    setAddingManual(true);
    try {
      const start = new Date(`${dateStr}T${manualTime}`);
      const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
      await authFetch(`/admin/tours/${tourId}/schedules`, {
        method: "POST",
        body: JSON.stringify({
          startDateTime: start.toISOString(),
          endDateTime: end.toISOString(),
        }),
      });
      await onRefresh();
    } catch {
      /* handled */
    } finally {
      setAddingManual(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: 420 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: "bold" }}>{dateLabel}</h3>
          <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", fontSize: 18, color: "#6b7280" }}>×</button>
        </div>

        {/* All closed toggle */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "8px 12px",
          background: isAllClosed ? "#fee2e2" : "#f9fafb",
          borderRadius: 6,
          marginBottom: 12,
        }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>全出発クローズ</span>
          <button
            onClick={toggleAllClosed}
            style={{
              padding: "4px 12px",
              fontSize: 12,
              borderRadius: 4,
              border: "1px solid",
              borderColor: isAllClosed ? "#ef4444" : "#d1d5db",
              background: isAllClosed ? "#ef4444" : "#fff",
              color: isAllClosed ? "#fff" : "#374151",
              cursor: "pointer",
            }}
          >
            {isAllClosed ? "クローズ中" : "クローズする"}
          </button>
        </div>

        {/* Time slots */}
        {slots.length > 0 && !isAllClosed && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>出発時刻</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {slots.map((slot) => (
                <div
                  key={slot.time}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "6px 10px",
                    background: slot.closedOut ? "#fee2e2" : "#dcfce7",
                    borderRadius: 4,
                    fontSize: 13,
                  }}
                >
                  <span style={{
                    fontWeight: 600,
                    textDecoration: slot.closedOut ? "line-through" : "none",
                    color: slot.closedOut ? "#991b1b" : "#166534",
                  }}>
                    {slot.time}
                  </span>
                  <button
                    onClick={() => toggleCloseOut(slot.time)}
                    style={{
                      padding: "2px 10px",
                      fontSize: 11,
                      borderRadius: 4,
                      border: "1px solid",
                      borderColor: slot.closedOut ? "#ef4444" : "#d1d5db",
                      background: slot.closedOut ? "#ef4444" : "#fff",
                      color: slot.closedOut ? "#fff" : "#374151",
                      cursor: "pointer",
                    }}
                  >
                    {slot.closedOut ? "クローズ中" : "クローズ"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {slots.length === 0 && !isAllClosed && (
          <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 12 }}>
            この日にマッチするルールがありません
          </p>
        )}

        {/* Reason */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, color: "#6b7280" }}>クローズ理由（任意）</label>
          <input
            className="form-input"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="例: 祝日、ガイド不在"
            style={{ fontSize: 13 }}
          />
        </div>

        {/* Manual slot add */}
        <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>手動スロット追加</div>
          <form onSubmit={handleAddManualSlot} style={{ display: "flex", gap: 8, alignItems: "end" }}>
            <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: 11 }}>時刻</label>
              <input
                className="form-input"
                type="time"
                value={manualTime}
                onChange={(e) => setManualTime(e.target.value)}
                required
                style={{ fontSize: 13 }}
              />
            </div>
            <button type="submit" className="btn btn-primary btn-sm" disabled={addingManual} style={{ fontSize: 11 }}>
              {addingManual ? "追加中..." : "+ 追加"}
            </button>
          </form>
          <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>
            ツアー時間 {durationMinutes}分で自動計算
          </p>
        </div>
      </div>
    </div>
  );
}
