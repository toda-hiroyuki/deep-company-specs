"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Area,
  AreaChart,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
} from "recharts";
import { useAuth, formatDateTime, statusBadgeClass, statusLabel } from "@/lib/client-auth";
import { useI18n } from "@/lib/i18n";

type Period = "today" | "7d" | "30d" | "custom";

interface DashboardData {
  period: Period;
  range: { start: string; end: string };
  kpi: {
    totalSchedules: number;
    totalBookings: number;
    totalGuests: number;
    avgFillRate: number;
    unassignedGuideBookings: number;
  };
  dailyTrend: { day: string; bookings: number; guests: number }[];
  tourRollup: {
    tourId: string;
    title: string;
    scheduleCount: number;
    bookingCount: number;
    guestCount: number;
    totalSeats: number;
    avgFillRate: number;
  }[];
  statusBreakdown: { status: string; count: number }[];
  upcomingSchedules: {
    id: string;
    tourId: string;
    tourTitle: string;
    startDateTime: string;
    status: string;
    totalSeats: number;
    bookedGuests: number;
    bookingCount: number;
    fillRate: number;
    hasAcceptedGuide: boolean;
  }[];
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "#f59e0b",
  CONFIRMED: "#10b981",
  IN_PROGRESS: "#3b82f6",
  COMPLETED: "#6b7280",
  CANCELLED: "#ef4444",
  EXPIRED: "#9ca3af",
};

export default function AdminDashboardPage() {
  const { t } = useI18n();
  const { loading: authLoading, authFetch } = useAuth("admin");
  const [period, setPeriod] = useState<Period>("7d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (period === "custom" && (!customFrom || !customTo)) return;

    setLoading(true);
    setError(null);

    const qs = new URLSearchParams({ period });
    if (period === "custom") {
      qs.set("from", customFrom);
      qs.set("to", customTo);
    }

    authFetch(`/admin/dashboard?${qs.toString()}`)
      .then((res: DashboardData) => setData(res))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"))
      .finally(() => setLoading(false));
  }, [authLoading, authFetch, period, customFrom, customTo]);

  const periodOptions: { value: Period; label: string }[] = useMemo(
    () => [
      { value: "today", label: t("dashboard.period.today") },
      { value: "7d", label: t("dashboard.period.last7") },
      { value: "30d", label: t("dashboard.period.last30") },
      { value: "custom", label: t("dashboard.period.custom") },
    ],
    [t]
  );

  if (authLoading) return null;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{t("dashboard.title")}</h1>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div className="tab-bar" style={{ marginBottom: 0 }}>
            {periodOptions.map((opt) => (
              <button
                key={opt.value}
                className={`tab ${period === opt.value ? "active" : ""}`}
                onClick={() => setPeriod(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {period === "custom" && (
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input
                type="date"
                className="form-input"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                style={{ width: 150 }}
              />
              <span style={{ color: "#6b7280" }}>—</span>
              <input
                type="date"
                className="form-input"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                style={{ width: 150 }}
              />
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="card" style={{ background: "#fee2e2", color: "#991b1b" }}>
          {error}
        </div>
      )}

      {loading && !data ? (
        <div className="loading">{t("loading")}</div>
      ) : data ? (
        <DashboardContent data={data} />
      ) : null}
    </div>
  );
}

function DashboardContent({ data }: { data: DashboardData }) {
  const { t } = useI18n();
  const { kpi, dailyTrend, tourRollup, statusBreakdown, upcomingSchedules } = data;

  const fillPct = (kpi.avgFillRate * 100).toFixed(0);

  return (
    <>
      {/* KPI Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 16,
          marginBottom: 16,
        }}
      >
        <KpiCard
          label={t("dashboard.kpi.schedules")}
          value={kpi.totalSchedules.toLocaleString()}
          accent="#3b82f6"
        />
        <KpiCard
          label={t("dashboard.kpi.bookings")}
          value={kpi.totalBookings.toLocaleString()}
          accent="#10b981"
        />
        <KpiCard
          label={t("dashboard.kpi.guests")}
          value={kpi.totalGuests.toLocaleString()}
          accent="#8b5cf6"
        />
        <KpiCard
          label={t("dashboard.kpi.avgFillRate")}
          value={`${fillPct}%`}
          accent="#f59e0b"
          progress={kpi.avgFillRate}
        />
        <KpiCard
          label={t("dashboard.kpi.unassigned")}
          value={kpi.unassignedGuideBookings.toLocaleString()}
          accent={kpi.unassignedGuideBookings > 0 ? "#ef4444" : "#10b981"}
          highlight={kpi.unassignedGuideBookings > 0}
        />
      </div>

      {/* Charts row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: 16,
          marginBottom: 16,
        }}
      >
        <div className="card" style={{ marginBottom: 0 }}>
          <h3 style={{ fontSize: 14, color: "#6b7280", marginBottom: 12, fontWeight: 600 }}>
            {t("dashboard.charts.dailyTrend")}
          </h3>
          <div style={{ width: "100%", height: 280 }}>
            <ResponsiveContainer>
              <AreaChart data={dailyTrend} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="bookingsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="guestsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                  tickFormatter={(v: string) => v.slice(5)} // MM-DD
                />
                <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 6 }}
                  labelFormatter={(label) => label}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area
                  type="monotone"
                  name={t("dashboard.charts.bookings")}
                  dataKey="bookings"
                  stroke="#3b82f6"
                  fill="url(#bookingsGrad)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  name={t("dashboard.charts.guests")}
                  dataKey="guests"
                  stroke="#8b5cf6"
                  fill="url(#guestsGrad)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 0 }}>
          <h3 style={{ fontSize: 14, color: "#6b7280", marginBottom: 12, fontWeight: 600 }}>
            {t("dashboard.charts.statusBreakdown")}
          </h3>
          {statusBreakdown.length === 0 ? (
            <div style={{ color: "#9ca3af", textAlign: "center", padding: 60, fontSize: 13 }}>
              {t("dashboard.empty")}
            </div>
          ) : (
            <div style={{ width: "100%", height: 280 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={statusBreakdown.map((s) => ({
                      ...s,
                      label: statusLabel(s.status, t),
                    }))}
                    dataKey="count"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={85}
                    paddingAngle={2}
                  >
                    {statusBreakdown.map((entry, idx) => (
                      <Cell
                        key={idx}
                        fill={STATUS_COLORS[entry.status] || "#9ca3af"}
                      />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} iconSize={10} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Tour rollup */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, color: "#6b7280", marginBottom: 12, fontWeight: 600 }}>
          {t("dashboard.tourRollup.title")}
        </h3>

        {tourRollup.length === 0 ? (
          <div style={{ color: "#9ca3af", textAlign: "center", padding: 30, fontSize: 13 }}>
            {t("dashboard.empty")}
          </div>
        ) : (
          <>
            {/* Top 10 horizontal bar chart */}
            <div style={{ width: "100%", height: Math.max(220, tourRollup.slice(0, 10).length * 32) }}>
              <ResponsiveContainer>
                <BarChart
                  data={tourRollup.slice(0, 10)}
                  layout="vertical"
                  margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "#6b7280" }} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="title"
                    tick={{ fontSize: 11, fill: "#374151" }}
                    width={180}
                  />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} />
                  <Bar
                    dataKey="guestCount"
                    name={t("dashboard.charts.guests")}
                    fill="#8b5cf6"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Detailed table */}
            <table style={{ marginTop: 12 }}>
              <thead>
                <tr>
                  <th>{t("dashboard.tourRollup.tour")}</th>
                  <th style={{ textAlign: "right" }}>{t("dashboard.tourRollup.scheduleCount")}</th>
                  <th style={{ textAlign: "right" }}>{t("dashboard.tourRollup.bookingCount")}</th>
                  <th style={{ textAlign: "right" }}>{t("dashboard.tourRollup.guestCount")}</th>
                  <th style={{ textAlign: "right" }}>{t("dashboard.tourRollup.totalSeats")}</th>
                  <th style={{ width: 140 }}>{t("dashboard.tourRollup.fillRate")}</th>
                </tr>
              </thead>
              <tbody>
                {tourRollup.map((row) => (
                  <tr key={row.tourId} style={{ cursor: "default" }}>
                    <td style={{ fontWeight: 500 }}>{row.title}</td>
                    <td style={{ textAlign: "right" }}>{row.scheduleCount}</td>
                    <td style={{ textAlign: "right" }}>{row.bookingCount}</td>
                    <td style={{ textAlign: "right" }}>{row.guestCount}</td>
                    <td style={{ textAlign: "right", color: "#6b7280" }}>
                      {row.totalSeats}
                    </td>
                    <td>
                      <FillBar rate={row.avgFillRate} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>

      {/* Upcoming schedules */}
      <div className="card">
        <h3 style={{ fontSize: 14, color: "#6b7280", marginBottom: 12, fontWeight: 600 }}>
          {t("dashboard.upcoming.title")}
        </h3>

        {upcomingSchedules.length === 0 ? (
          <div style={{ color: "#9ca3af", textAlign: "center", padding: 30, fontSize: 13 }}>
            {t("dashboard.empty")}
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>{t("dashboard.upcoming.startDateTime")}</th>
                <th>{t("dashboard.upcoming.tour")}</th>
                <th style={{ textAlign: "right" }}>{t("dashboard.upcoming.seats")}</th>
                <th style={{ width: 200 }}>{t("dashboard.upcoming.fillRate")}</th>
                <th>{t("dashboard.upcoming.guideAssigned")}</th>
                <th>{t("dashboard.upcoming.status")}</th>
              </tr>
            </thead>
            <tbody>
              {upcomingSchedules.map((s) => (
                <tr key={s.id} style={{ cursor: "default" }}>
                  <td>{formatDateTime(s.startDateTime)}</td>
                  <td style={{ fontWeight: 500 }}>{s.tourTitle}</td>
                  <td style={{ textAlign: "right" }}>
                    {s.bookedGuests} / {s.totalSeats}
                  </td>
                  <td>
                    <FillBar rate={s.fillRate} />
                  </td>
                  <td>
                    {s.bookingCount === 0 ? (
                      <span style={{ color: "#9ca3af", fontSize: 12 }}>—</span>
                    ) : s.hasAcceptedGuide ? (
                      <span className="badge badge-confirmed">
                        {t("dashboard.upcoming.guideOk")}
                      </span>
                    ) : (
                      <span className="badge badge-pending">
                        {t("dashboard.upcoming.guideNone")}
                      </span>
                    )}
                  </td>
                  <td>
                    <span className={statusBadgeClass(s.status)}>{statusLabel(s.status, t)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

function KpiCard({
  label,
  value,
  accent,
  progress,
  highlight,
}: {
  label: string;
  value: string;
  accent: string;
  progress?: number;
  highlight?: boolean;
}) {
  return (
    <div
      className="card"
      style={{
        marginBottom: 0,
        borderLeft: `4px solid ${accent}`,
        background: highlight ? "#fef2f2" : "white",
      }}
    >
      <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.4 }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: accent }}>{value}</div>
      {progress !== undefined && (
        <div
          style={{
            marginTop: 8,
            height: 4,
            background: "#f3f4f6",
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${Math.min(100, progress * 100)}%`,
              height: "100%",
              background: accent,
              transition: "width 0.4s",
            }}
          />
        </div>
      )}
    </div>
  );
}

function FillBar({ rate }: { rate: number }) {
  const pct = Math.max(0, Math.min(1, rate)) * 100;
  // Colour ramp: red <30%, amber 30-70%, green >70%
  const color = pct < 30 ? "#ef4444" : pct < 70 ? "#f59e0b" : "#10b981";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div
        style={{
          flex: 1,
          height: 8,
          background: "#f3f4f6",
          borderRadius: 4,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: color,
            transition: "width 0.4s",
          }}
        />
      </div>
      <span style={{ fontSize: 12, color: "#6b7280", minWidth: 40, textAlign: "right" }}>
        {pct.toFixed(0)}%
      </span>
    </div>
  );
}
