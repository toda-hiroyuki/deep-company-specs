"use client";

import { useState, useMemo } from "react";

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

interface CloseOut {
  id: string;
  date: string;
  startTime: { hour: number; minute: number } | null;
  reason: string | null;
}

interface Schedule {
  id: string;
  startDateTime: string;
  endDateTime: string;
  capacity: number;
  status: string;
}

type DayStatus = "open" | "partial" | "closed" | "none";

interface DayInfo {
  date: Date;
  status: DayStatus;
  slots: { time: string; closedOut: boolean }[];
  scheduleCount: number;
}

interface Props {
  capacityRules: CapacityRule[];
  closeOuts: CloseOut[];
  schedules: Schedule[];
  onDateClick: (date: Date, slots: { time: string; closedOut: boolean }[]) => void;
  tourId: string;
  authFetch: (path: string, options?: RequestInit) => Promise<any>;
  onRefresh: () => Promise<void>;
}

const DAY_HEADERS = ["日", "月", "火", "水", "木", "金", "土"];

function formatTime(t: { hour: number; minute: number }) {
  return `${String(t.hour).padStart(2, "0")}:${String(t.minute).padStart(2, "0")}`;
}

// Check if a rule matches a given date
function ruleMatchesDate(rule: CapacityRule, date: Date): boolean {
  const dayOfWeek = date.getDay();
  switch (rule.ruleType) {
    case "WEEKLY":
      return rule.daysOfWeek.includes(dayOfWeek);
    case "RANGE":
      if (rule.startDate && rule.endDate) {
        const start = new Date(rule.startDate);
        const end = new Date(rule.endDate);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        return date >= start && date <= end && rule.daysOfWeek.includes(dayOfWeek);
      }
      return false;
    case "SINGLE":
      if (rule.singleDate) {
        const sd = new Date(rule.singleDate);
        return date.getFullYear() === sd.getFullYear() &&
          date.getMonth() === sd.getMonth() &&
          date.getDate() === sd.getDate();
      }
      return false;
    case "YEARLY":
      if (rule.startDate) {
        const yd = new Date(rule.startDate);
        return date.getMonth() === yd.getMonth() && date.getDate() === yd.getDate();
      }
      return false;
    default:
      return false;
  }
}

export default function MonthlyCalendar({
  capacityRules,
  closeOuts,
  schedules,
  onDateClick,
  tourId,
  authFetch,
  onRefresh,
}: Props) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [generating, setGenerating] = useState(false);

  // Build close-out lookup for current month
  const closeOutMap = useMemo(() => {
    const map = new Map<string, { allClosed: boolean; closedTimes: Set<string>; }>();
    for (const co of closeOuts) {
      const dateKey = new Date(co.date).toISOString().split("T")[0];
      const existing = map.get(dateKey);
      if (!co.startTime) {
        map.set(dateKey, { allClosed: true, closedTimes: new Set() });
      } else {
        const timeKey = `${co.startTime.hour}:${co.startTime.minute}`;
        if (existing?.allClosed) continue;
        if (!existing) {
          map.set(dateKey, { allClosed: false, closedTimes: new Set([timeKey]) });
        } else {
          existing.closedTimes.add(timeKey);
        }
      }
    }
    return map;
  }, [closeOuts]);

  // Build schedule lookup
  const scheduleByDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of schedules) {
      const dateKey = new Date(s.startDateTime).toISOString().split("T")[0];
      map.set(dateKey, (map.get(dateKey) || 0) + 1);
    }
    return map;
  }, [schedules]);

  // Generate calendar days for current month
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Pad start to fill the week
    const startPad = firstDay.getDay();
    const days: (DayInfo | null)[] = [];

    for (let i = 0; i < startPad; i++) {
      days.push(null);
    }

    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(year, month, d);
      const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

      const coInfo = closeOutMap.get(dateKey);

      // Find matching rule (highest priority first, rules are already sorted by priority desc)
      const sortedRules = [...capacityRules].sort((a, b) => b.priority - a.priority);
      let matchingRule: CapacityRule | null = null;
      for (const rule of sortedRules) {
        if (rule.isActive && ruleMatchesDate(rule, date)) {
          matchingRule = rule;
          break;
        }
      }

      if (!matchingRule) {
        days.push({ date, status: "none", slots: [], scheduleCount: scheduleByDate.get(dateKey) || 0 });
        continue;
      }

      // Generate slots
      const slots = matchingRule.startTimes.map((t) => {
        const timeKey = `${t.hour}:${t.minute}`;
        const closedOut = coInfo?.allClosed || (coInfo?.closedTimes.has(timeKey) ?? false);
        return { time: formatTime(t), closedOut };
      });

      const allClosed = coInfo?.allClosed || slots.every((s) => s.closedOut);
      const someClosed = !allClosed && slots.some((s) => s.closedOut);

      const status: DayStatus = allClosed ? "closed" : someClosed ? "partial" : "open";

      days.push({ date, status, slots, scheduleCount: scheduleByDate.get(dateKey) || 0 });
    }

    return days;
  }, [currentMonth, capacityRules, closeOuts, closeOutMap, scheduleByDate]);

  function prevMonth() {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  }

  function nextMonth() {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  }

  async function handleGenerate() {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const dateFrom = new Date(year, month, 1).toISOString().split("T")[0];
    const dateTo = new Date(year, month + 1, 0).toISOString().split("T")[0];

    setGenerating(true);
    try {
      const result = await authFetch(`/admin/tours/${tourId}/schedules/generate`, {
        method: "POST",
        body: JSON.stringify({ dateFrom, dateTo }),
      });
      alert(`${result.created}件のスケジュールを生成しました`);
      await onRefresh();
    } catch {
      /* handled */
    } finally {
      setGenerating(false);
    }
  }

  const statusColors: Record<DayStatus, string> = {
    open: "#dcfce7",
    partial: "#fef9c3",
    closed: "#fee2e2",
    none: "#f3f4f6",
  };

  const monthLabel = `${currentMonth.getFullYear()}年${currentMonth.getMonth() + 1}月`;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h2 style={{ fontSize: 16, fontWeight: "bold" }}>● カレンダー</h2>
        <button
          className="btn btn-primary btn-sm"
          style={{ fontSize: 11 }}
          onClick={handleGenerate}
          disabled={generating}
        >
          {generating ? "生成中..." : "スケジュール生成"}
        </button>
      </div>

      {/* Month navigation */}
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 16, marginBottom: 12 }}>
        <button onClick={prevMonth} style={{ border: "none", background: "none", cursor: "pointer", fontSize: 18, color: "#6b7280" }}>◀</button>
        <span style={{ fontSize: 15, fontWeight: 600 }}>{monthLabel}</span>
        <button onClick={nextMonth} style={{ border: "none", background: "none", cursor: "pointer", fontSize: 18, color: "#6b7280" }}>▶</button>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 12, marginBottom: 8, fontSize: 11, color: "#6b7280" }}>
        <span><span style={{ display: "inline-block", width: 10, height: 10, background: statusColors.open, borderRadius: 2, marginRight: 3 }} />オープン</span>
        <span><span style={{ display: "inline-block", width: 10, height: 10, background: statusColors.partial, borderRadius: 2, marginRight: 3 }} />一部クローズ</span>
        <span><span style={{ display: "inline-block", width: 10, height: 10, background: statusColors.closed, borderRadius: 2, marginRight: 3 }} />全クローズ</span>
        <span><span style={{ display: "inline-block", width: 10, height: 10, background: statusColors.none, borderRadius: 2, marginRight: 3 }} />ルールなし</span>
      </div>

      {/* Calendar grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 1, background: "#e5e7eb", borderRadius: 8, overflow: "hidden" }}>
        {/* Header */}
        {DAY_HEADERS.map((d, i) => (
          <div key={i} style={{
            padding: "6px 4px",
            textAlign: "center",
            fontSize: 12,
            fontWeight: 600,
            background: "#f9fafb",
            color: i === 0 ? "#ef4444" : i === 6 ? "#3b82f6" : "#374151",
          }}>
            {d}
          </div>
        ))}

        {/* Days */}
        {calendarDays.map((day, i) => {
          if (!day) {
            return <div key={`empty-${i}`} style={{ background: "#fff", padding: 4, minHeight: 70 }} />;
          }
          const isToday = (() => {
            const now = new Date();
            return day.date.getFullYear() === now.getFullYear() &&
              day.date.getMonth() === now.getMonth() &&
              day.date.getDate() === now.getDate();
          })();
          const dayOfWeek = day.date.getDay();

          return (
            <div
              key={i}
              onClick={() => onDateClick(day.date, day.slots)}
              style={{
                background: statusColors[day.status],
                padding: 4,
                minHeight: 70,
                cursor: "pointer",
                position: "relative",
                transition: "opacity 0.15s",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = "0.8"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
            >
              <div style={{
                fontSize: 12,
                fontWeight: isToday ? 700 : 400,
                color: dayOfWeek === 0 ? "#ef4444" : dayOfWeek === 6 ? "#3b82f6" : "#374151",
                marginBottom: 2,
              }}>
                {isToday ? (
                  <span style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: "#3b82f6",
                    color: "#fff",
                  }}>
                    {day.date.getDate()}
                  </span>
                ) : (
                  day.date.getDate()
                )}
              </div>
              {/* Time badges */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                {day.slots.slice(0, 3).map((slot, si) => (
                  <span
                    key={si}
                    style={{
                      fontSize: 9,
                      padding: "0 3px",
                      borderRadius: 2,
                      background: slot.closedOut ? "#fca5a5" : "#86efac",
                      color: slot.closedOut ? "#991b1b" : "#166534",
                      textDecoration: slot.closedOut ? "line-through" : "none",
                    }}
                  >
                    {slot.time}
                  </span>
                ))}
                {day.slots.length > 3 && (
                  <span style={{ fontSize: 9, color: "#9ca3af" }}>+{day.slots.length - 3}</span>
                )}
              </div>
              {/* Schedule count */}
              {day.scheduleCount > 0 && (
                <div style={{ fontSize: 9, color: "#6b7280", marginTop: 2 }}>
                  予約枠{day.scheduleCount}件
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
