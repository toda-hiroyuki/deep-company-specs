"use client";

import { useState } from "react";

interface CapacityRule {
  id: string;
  ruleType: string;
  daysOfWeek: number[];
  startDate: string | null;
  endDate: string | null;
  singleDate: string | null;
  startTimes: { hour: number; minute: number }[];
  capacity: number;
  minParticipants: number;
  priority: number;
  isActive: boolean;
}

interface Props {
  rules: CapacityRule[];
  tourId: string;
  authFetch: (path: string, options?: RequestInit) => Promise<any>;
  onRefresh: () => Promise<void>;
}

const DAY_NAMES = ["日", "月", "火", "水", "木", "金", "土"];
const RULE_TYPE_LABELS: Record<string, string> = {
  WEEKLY: "毎週",
  RANGE: "期間指定",
  SINGLE: "単発",
  YEARLY: "毎年",
};

export default function CapacityRuleForm({ rules, tourId, authFetch, onRefresh }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [ruleType, setRuleType] = useState("WEEKLY");
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([1, 2, 3, 4, 5]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [singleDate, setSingleDate] = useState("");
  const [startTimes, setStartTimes] = useState<{ hour: number; minute: number }[]>([{ hour: 10, minute: 0 }]);
  const [capacity, setCapacity] = useState(8);
  const [minParticipants, setMinParticipants] = useState(1);
  const [priority, setPriority] = useState(1);
  const [newTimeHour, setNewTimeHour] = useState(10);
  const [newTimeMinute, setNewTimeMinute] = useState(0);

  function resetForm() {
    setRuleType("WEEKLY");
    setDaysOfWeek([1, 2, 3, 4, 5]);
    setStartDate("");
    setEndDate("");
    setSingleDate("");
    setStartTimes([{ hour: 10, minute: 0 }]);
    setCapacity(8);
    setMinParticipants(1);
    setPriority(1);
    setNewTimeHour(10);
    setNewTimeMinute(0);
  }

  function toggleDay(day: number) {
    setDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  }

  function addTime() {
    const exists = startTimes.some((t) => t.hour === newTimeHour && t.minute === newTimeMinute);
    if (!exists) {
      setStartTimes(
        [...startTimes, { hour: newTimeHour, minute: newTimeMinute }].sort(
          (a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute)
        )
      );
    }
  }

  function removeTime(index: number) {
    setStartTimes(startTimes.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (startTimes.length === 0) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        ruleType,
        startTimes,
        capacity,
        minParticipants,
        priority,
      };
      if (ruleType === "WEEKLY" || ruleType === "RANGE" || ruleType === "YEARLY") {
        body.daysOfWeek = daysOfWeek;
      }
      if (ruleType === "RANGE") {
        body.startDate = startDate;
        body.endDate = endDate || null;
      }
      if (ruleType === "SINGLE") {
        body.singleDate = singleDate;
      }
      if (ruleType === "YEARLY") {
        body.startDate = startDate;
      }
      await authFetch(`/admin/tours/${tourId}/capacity-rules`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      setShowForm(false);
      resetForm();
      await onRefresh();
    } catch {
      /* handled */
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(ruleId: string) {
    if (!confirm("このルールを削除しますか？")) return;
    try {
      await authFetch(`/admin/tours/${tourId}/capacity-rules`, {
        method: "DELETE",
        body: JSON.stringify({ id: ruleId }),
      });
      await onRefresh();
    } catch {
      /* handled */
    }
  }

  function formatTime(t: { hour: number; minute: number }) {
    return `${String(t.hour).padStart(2, "0")}:${String(t.minute).padStart(2, "0")}`;
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h2 style={{ fontSize: 16, fontWeight: "bold" }}>● 可能枠ルール ({rules.length})</h2>
        <button
          className="btn btn-primary btn-sm"
          style={{ fontSize: 12 }}
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? "閉じる" : "+ ルール追加"}
        </button>
      </div>

      {/* Add rule form */}
      {showForm && (
        <div className="card" style={{ marginBottom: 12, padding: 16 }}>
          <form onSubmit={handleSubmit}>
            {/* Rule type */}
            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label" style={{ fontSize: 13 }}>ルール種別</label>
              <select
                className="form-input"
                value={ruleType}
                onChange={(e) => setRuleType(e.target.value)}
                style={{ fontSize: 13 }}
              >
                {Object.entries(RULE_TYPE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label} ({key})</option>
                ))}
              </select>
            </div>

            {/* Days of week (WEEKLY, RANGE, YEARLY) */}
            {(ruleType === "WEEKLY" || ruleType === "RANGE" || ruleType === "YEARLY") && (
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="form-label" style={{ fontSize: 13 }}>曜日</label>
                <div style={{ display: "flex", gap: 4 }}>
                  {DAY_NAMES.map((name, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggleDay(i)}
                      style={{
                        padding: "4px 10px",
                        fontSize: 12,
                        borderRadius: 4,
                        border: "1px solid #d1d5db",
                        background: daysOfWeek.includes(i) ? "#3b82f6" : "#fff",
                        color: daysOfWeek.includes(i) ? "#fff" : "#374151",
                        cursor: "pointer",
                      }}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Date range (RANGE) */}
            {ruleType === "RANGE" && (
              <div className="form-row" style={{ marginBottom: 12 }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: 13 }}>開始日</label>
                  <input className="form-input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required style={{ fontSize: 13 }} />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: 13 }}>終了日</label>
                  <input className="form-input" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ fontSize: 13 }} />
                </div>
              </div>
            )}

            {/* Single date */}
            {ruleType === "SINGLE" && (
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="form-label" style={{ fontSize: 13 }}>日付</label>
                <input className="form-input" type="date" value={singleDate} onChange={(e) => setSingleDate(e.target.value)} required style={{ fontSize: 13 }} />
              </div>
            )}

            {/* Yearly date */}
            {ruleType === "YEARLY" && (
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="form-label" style={{ fontSize: 13 }}>基準日（月/日として使用）</label>
                <input className="form-input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required style={{ fontSize: 13 }} />
              </div>
            )}

            {/* Start times */}
            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label" style={{ fontSize: 13 }}>出発時刻</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
                {startTimes.map((t, i) => (
                  <span
                    key={i}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "2px 8px",
                      fontSize: 12,
                      background: "#e0f2fe",
                      borderRadius: 4,
                    }}
                  >
                    {formatTime(t)}
                    <button type="button" onClick={() => removeTime(i)} style={{ border: "none", background: "none", cursor: "pointer", color: "#6b7280", fontSize: 14, padding: 0 }}>×</button>
                  </span>
                ))}
                {startTimes.length === 0 && <span style={{ fontSize: 12, color: "#9ca3af" }}>時刻を追加してください</span>}
              </div>
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <input
                  type="number" min={0} max={23} value={newTimeHour}
                  onChange={(e) => setNewTimeHour(Number(e.target.value))}
                  style={{ width: 50, fontSize: 13, padding: "4px 6px", border: "1px solid #d1d5db", borderRadius: 4 }}
                />
                <span style={{ fontSize: 13 }}>:</span>
                <input
                  type="number" min={0} max={59} step={15} value={newTimeMinute}
                  onChange={(e) => setNewTimeMinute(Number(e.target.value))}
                  style={{ width: 50, fontSize: 13, padding: "4px 6px", border: "1px solid #d1d5db", borderRadius: 4 }}
                />
                <button type="button" className="btn btn-sm" onClick={addTime} style={{ fontSize: 11 }}>+ 追加</button>
              </div>
            </div>

            {/* Capacity, priority, minParticipants */}
            <div className="form-row" style={{ marginBottom: 12 }}>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: 13 }}>定員</label>
                <input className="form-input" type="number" min={1} value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} required style={{ fontSize: 13 }} />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: 13 }}>優先度</label>
                <input className="form-input" type="number" min={0} value={priority} onChange={(e) => setPriority(Number(e.target.value))} style={{ fontSize: 13 }} />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: 13 }}>最少催行</label>
                <input className="form-input" type="number" min={1} value={minParticipants} onChange={(e) => setMinParticipants(Number(e.target.value))} style={{ fontSize: 13 }} />
              </div>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" className="btn btn-primary btn-sm" disabled={saving} style={{ fontSize: 12 }}>
                {saving ? "保存中..." : "追加"}
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setShowForm(false); resetForm(); }} style={{ fontSize: 12 }}>
                キャンセル
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Rules list */}
      {rules.length === 0 ? (
        <div className="card">
          <p className="text-muted text-sm">ルールが未設定です</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {rules.map((rule) => {
            const days = rule.daysOfWeek.map((d) => DAY_NAMES[d]).join(", ");
            const times = rule.startTimes.map((t) => formatTime(t)).join(", ");
            return (
              <div key={rule.id} className="card" style={{ padding: "8px 10px", fontSize: 13 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ flex: 1 }}>
                    <span className="badge badge-open" style={{ fontSize: 10, marginRight: 6 }}>
                      {RULE_TYPE_LABELS[rule.ruleType] || rule.ruleType}
                    </span>
                    {days && <span style={{ fontWeight: 600 }}>{days}</span>}
                    <span style={{ color: "#6b7280", marginLeft: 8 }}>{times}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 12, color: "#6b7280" }}>
                      定員{rule.capacity}名 / 優先度{rule.priority}
                    </span>
                    <button
                      className="btn btn-danger btn-sm"
                      style={{ fontSize: 10, padding: "1px 6px" }}
                      onClick={() => handleDelete(rule.id)}
                    >
                      ×
                    </button>
                  </div>
                </div>
                {rule.startDate && (
                  <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
                    期間: {new Date(rule.startDate).toLocaleDateString("ja-JP")}
                    {rule.endDate ? ` 〜 ${new Date(rule.endDate).toLocaleDateString("ja-JP")}` : " 〜 無期限"}
                  </div>
                )}
                {rule.singleDate && (
                  <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
                    日付: {new Date(rule.singleDate).toLocaleDateString("ja-JP")}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
