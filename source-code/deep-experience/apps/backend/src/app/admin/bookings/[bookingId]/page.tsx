"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth, statusBadgeClass, statusLabel, formatDateTime, formatPrice } from "@/lib/client-auth";
import { useI18n } from "@/lib/i18n";

interface Booking {
  id: string;
  status: string;
  assignmentState: string;
  travelerName: string;
  travelerEmail: string;
  numberOfGuests: number;
  totalPriceCents: number;
  unitPriceCents: number;
  specialRequests: string | null;
  createdAt: string;
  tour: { id: string; title: string; durationMinutes: number };
  schedule: {
    id: string;
    startDateTime: string;
    endDateTime: string;
    meetingPointName: string;
    capacity: number;
    maxParticipants: number;
  };
  assignments: { id: string; status: string; guideName: string; guideId: string; declineReason: string | null }[];
}

interface Guide {
  id: string;
  name: string;
  email: string;
  languages: string[];
  areas: string[];
  isActive: boolean;
}

// Public availability API slot shape (apps/backend/src/app/api/v1/tours/[tourId]/availability/route.ts).
interface AvailabilitySlot {
  date: string;
  time: string;
  capacity: number;
  scheduleId: string | null;
}

interface AvailabilityDay {
  date: string;
  slots: AvailabilitySlot[];
}

// Booking statuses where mutating UIs (schedule reassign, guest-count edit) are
// disabled. Same set for both — terminal/in-flight bookings shouldn't be edited
// from the admin detail page.
const NON_EDITABLE_BOOKING_STATUSES = new Set([
  "CANCELLED",
  "EXPIRED",
  "COMPLETED",
  "IN_PROGRESS",
]);

export default function AdminBookingDetailPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const router = useRouter();
  const { loading: authLoading, authFetch } = useAuth("admin");
  const { t } = useI18n();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [showAssign, setShowAssign] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [declineTargetId, setDeclineTargetId] = useState<string | null>(null);
  const [showReassign, setShowReassign] = useState(false);
  const [showEditGuests, setShowEditGuests] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    loadData();
  }, [authLoading]);

  async function loadData() {
    try {
      const [bData, gData] = await Promise.all([
        authFetch(`/admin/bookings/${bookingId}`).then(
          (d: { booking: Booking }) => d.booking
        ),
        authFetch("/admin/guides"),
      ]);
      setBooking(bData);
      setGuides(gData.guides.filter((g: Guide) => g.isActive));
    } catch {
      // handled
    }
  }

  async function handleAssign(guideId: string) {
    setAssigning(true);
    setError("");
    try {
      await authFetch(`/admin/bookings/${bookingId}/assign`, {
        method: "POST",
        body: JSON.stringify({ guideId }),
      });
      setShowAssign(false);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Assign failed");
    } finally {
      setAssigning(false);
    }
  }

  async function handleAccept(assignmentId: string) {
    if (!window.confirm(t("booking.acceptConfirm"))) return;
    setActionLoading(true);
    setError("");
    try {
      await authFetch(`/admin/bookings/${bookingId}/assignments/${assignmentId}/accept`, {
        method: "POST",
      });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Accept failed");
    } finally {
      setActionLoading(false);
    }
  }

  function openDeclineModal(assignmentId: string) {
    setDeclineTargetId(assignmentId);
    setDeclineReason("");
    setShowDeclineModal(true);
  }

  async function handleDeclineSubmit() {
    if (!declineTargetId) return;
    setActionLoading(true);
    setError("");
    try {
      await authFetch(`/admin/bookings/${bookingId}/assignments/${declineTargetId}/decline`, {
        method: "POST",
        body: JSON.stringify({ reason: declineReason }),
      });
      setShowDeclineModal(false);
      setDeclineTargetId(null);
      setDeclineReason("");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Decline failed");
    } finally {
      setActionLoading(false);
    }
  }

  if (authLoading || !booking) return <div className="loading">{t("common.loading")}</div>;

  const canAssign = booking.status === "PENDING" && !booking.assignments.some((a) => a.status === "PENDING" || a.status === "ACCEPTED");

  const reassignDisabledReason = (() => {
    if (booking.assignmentState === "FINALIZED") {
      return t("booking.reassign.disabledFinalized");
    }
    if (NON_EDITABLE_BOOKING_STATUSES.has(booking.status)) {
      return t("booking.reassign.disabledStatus", { status: booking.status });
    }
    return null;
  })();
  const canReassign = reassignDisabledReason === null;

  // Guest-count editing intentionally ignores assignmentState — the underlying
  // updateBookingGuests service has no FINALIZED guard, so the UI honors that.
  const editGuestsDisabledReason = NON_EDITABLE_BOOKING_STATUSES.has(booking.status)
    ? t("booking.guests.disabledStatus", { status: booking.status })
    : null;
  const canEditGuests = editGuestsDisabledReason === null;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">
          <button className="btn btn-ghost btn-sm" style={{ marginRight: 8 }} onClick={() => router.back()}>←</button>
          {t("booking.detail")}
        </h1>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <span className={statusBadgeClass(booking.status)}>{statusLabel(booking.status, t)}</span>
          {booking.assignmentState === "FINALIZED" && (
            <span className="badge badge-finalized">{t("bookings.finalizedBadge")}</span>
          )}
        </div>
      </div>

      {error && <p className="form-error mb-2">{error}</p>}

      <div className="card">
        <div className="detail-row">
          <div className="detail-label">{t("bookings.tour")}</div>
          <div className="detail-value">
            <Link href={`/admin/tours/${booking.tour.id}`}>{booking.tour.title}</Link>
          </div>
        </div>
        <div className="detail-row">
          <div className="detail-label">{t("bookings.date")}</div>
          <div className="detail-value">{formatDateTime(booking.schedule.startDateTime)}</div>
        </div>
        <div className="detail-row">
          <div className="detail-label">{t("booking.meetingPoint")}</div>
          <div className="detail-value">{booking.schedule.meetingPointName}</div>
        </div>
        <div className="detail-row">
          <div className="detail-label">{t("bookings.traveler")}</div>
          <div className="detail-value">{booking.travelerName} ({booking.travelerEmail})</div>
        </div>
        <div className="detail-row">
          <div className="detail-label">{t("bookings.guests")}</div>
          <div className="detail-value">{booking.numberOfGuests}</div>
        </div>
        <div className="detail-row">
          <div className="detail-label">{t("booking.totalPrice")}</div>
          <div className="detail-value">{formatPrice(booking.totalPriceCents)}</div>
        </div>
        <div className="detail-row">
          <div className="detail-label">{t("booking.remainingSeatsLabel")}</div>
          <div className="detail-value">
            {t("booking.remainingSeats", {
              remaining: booking.schedule.capacity,
              max: booking.schedule.maxParticipants,
            })}
          </div>
        </div>
        {booking.specialRequests && (
          <div className="detail-row">
            <div className="detail-label">{t("booking.specialRequests")}</div>
            <div className="detail-value">{booking.specialRequests}</div>
          </div>
        )}
        <div className="detail-row">
          <div className="detail-label">{t("booking.created")}</div>
          <div className="detail-value">{formatDateTime(booking.createdAt)}</div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h2 style={{ fontSize: 18, fontWeight: "bold" }}>{t("booking.scheduleSection")}</h2>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="btn btn-secondary btn-sm"
              disabled={!canEditGuests}
              title={editGuestsDisabledReason ?? undefined}
              onClick={() => setShowEditGuests(true)}
            >
              {t("booking.guests.editButton")}
            </button>
            <button
              className="btn btn-secondary btn-sm"
              disabled={!canReassign}
              title={reassignDisabledReason ?? undefined}
              onClick={() => setShowReassign(true)}
            >
              {t("booking.reassign.button")}
            </button>
          </div>
          {editGuestsDisabledReason && (
            <span className="text-sm text-muted">{editGuestsDisabledReason}</span>
          )}
          {reassignDisabledReason && (
            <span className="text-sm text-muted">{reassignDisabledReason}</span>
          )}
        </div>
      </div>

      <h2 style={{ fontSize: 18, fontWeight: "bold", marginBottom: 12 }}>{t("booking.guideAssignments")}</h2>

      {booking.assignments.length === 0 ? (
        <p className="text-muted text-sm" style={{ marginBottom: 12 }}>{t("booking.noGuides")}</p>
      ) : (
        <div style={{ marginBottom: 12 }}>
          {booking.assignments.map((a) => (
            <div key={a.id} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <strong>{a.guideName}</strong>
                {a.status === "DECLINED" && a.declineReason && (
                  <div className="text-sm text-muted" style={{ marginTop: 4 }}>
                    {t("booking.declineReason")}: {a.declineReason}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {a.status === "PENDING" && (
                  <>
                    <button
                      className="btn btn-primary btn-sm"
                      disabled={actionLoading}
                      onClick={() => handleAccept(a.id)}
                    >
                      {t("booking.accept")}
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ color: "var(--color-error, #e53e3e)" }}
                      disabled={actionLoading}
                      onClick={() => openDeclineModal(a.id)}
                    >
                      {t("booking.decline")}
                    </button>
                  </>
                )}
                <span className={statusBadgeClass(a.status)}>{statusLabel(a.status, t)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {canAssign && (
        <button className="btn btn-primary" onClick={() => setShowAssign(true)}>
          {t("booking.assignGuide")}
        </button>
      )}

      {showAssign && (
        <div className="modal-overlay" onClick={() => setShowAssign(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: 18, fontWeight: "bold", marginBottom: 16 }}>{t("booking.selectGuide")}</h3>
            {error && <p className="form-error mb-2">{error}</p>}
            {guides.map((g) => {
              const alreadyAssigned = booking.assignments.some((a) => a.guideId === g.id);
              return (
                <div
                  key={g.id}
                  className="card"
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: alreadyAssigned ? "not-allowed" : "pointer", opacity: alreadyAssigned ? 0.5 : 1 }}
                  onClick={() => !alreadyAssigned && !assigning && handleAssign(g.id)}
                >
                  <div>
                    <strong>{g.name}</strong>
                    <div className="text-sm text-muted">{g.email}</div>
                    <div className="text-sm text-muted">
                      {g.languages.join(", ")} · {g.areas.join(", ")}
                    </div>
                  </div>
                  {alreadyAssigned ? (
                    <span className="text-sm text-muted">{t("booking.alreadyAssigned")}</span>
                  ) : (
                    <span className="btn btn-primary btn-sm">{t("booking.assign")}</span>
                  )}
                </div>
              );
            })}
            <button className="btn mt-4" style={{ width: "100%", justifyContent: "center", backgroundColor: "#e2e8f0", color: "#4a5568", border: "1px solid #cbd5e0" }} onClick={() => setShowAssign(false)}>
              {t("common.cancel")}
            </button>
          </div>
        </div>
      )}

      {showDeclineModal && (
        <div className="modal-overlay" onClick={() => setShowDeclineModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: 18, fontWeight: "bold", marginBottom: 16 }}>{t("booking.decline")}</h3>
            <div style={{ marginBottom: 12 }}>
              <label className="form-label">{t("booking.declineReason")}</label>
              <textarea
                className="form-input"
                rows={3}
                placeholder={t("booking.declineReasonPlaceholder")}
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
              />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="btn btn-primary"
                style={{ backgroundColor: "var(--color-error, #e53e3e)", flex: 1, justifyContent: "center" }}
                disabled={actionLoading}
                onClick={handleDeclineSubmit}
              >
                {t("booking.declineConfirm")}
              </button>
              <button
                className="btn"
                style={{ flex: 1, justifyContent: "center", backgroundColor: "#e2e8f0", color: "#4a5568", border: "1px solid #cbd5e0" }}
                onClick={() => setShowDeclineModal(false)}
              >
                {t("common.cancel")}
              </button>
            </div>
          </div>
        </div>
      )}

      {showReassign && (
        <ReassignModal
          booking={booking}
          authFetch={authFetch}
          t={t}
          onClose={() => setShowReassign(false)}
          onDone={async () => {
            setShowReassign(false);
            await loadData();
          }}
        />
      )}

      {showEditGuests && (
        <EditGuestsModal
          booking={booking}
          t={t}
          onClose={() => setShowEditGuests(false)}
          onDone={async () => {
            setShowEditGuests(false);
            await loadData();
          }}
        />
      )}
    </div>
  );
}

// authFetch's runtime signature is `(path, init?) => Promise<any>`. Avoid pinning
// generics here so the prop accepts the existing function without ceremony.
type AuthFetch = (path: string, init?: RequestInit) => Promise<unknown>;

interface ReassignModalProps {
  booking: Booking;
  authFetch: AuthFetch;
  t: (key: string, params?: Record<string, string | number>) => string;
  onClose: () => void;
  onDone: () => Promise<void>;
}

function ReassignModal({ booking, authFetch, t, onClose, onDone }: ReassignModalProps) {
  const [tab, setTab] = useState<"existing" | "new">("existing");
  const [candidates, setCandidates] = useState<AvailabilitySlot[] | null>(null);
  const [candidatesError, setCandidatesError] = useState<string | null>(null);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const [newStart, setNewStart] = useState("");
  const [confirmedAck, setConfirmedAck] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const requiresAck = booking.status === "CONFIRMED";
  const bookingDateKey = useMemo(
    () => booking.schedule.startDateTime.split("T")[0],
    [booking.schedule.startDateTime]
  );

  useEffect(() => {
    let cancelled = false;
    setCandidatesError(null);
    setCandidates(null);
    // Public API — no auth needed; use plain fetch via authFetch base path.
    const fromIso = `${bookingDateKey}T00:00:00.000Z`;
    const toIso = `${bookingDateKey}T23:59:59.999Z`;
    (authFetch(
      `/tours/${booking.tour.id}/availability?dateFrom=${encodeURIComponent(
        fromIso
      )}&dateTo=${encodeURIComponent(toIso)}`
    ) as Promise<{ availability: AvailabilityDay[] }>)
      .then((data) => {
        if (cancelled) return;
        const day = data.availability.find((d) => d.date === bookingDateKey);
        const candidates = (day?.slots ?? []).filter(
          (s) => s.scheduleId && s.scheduleId !== booking.schedule.id
        );
        setCandidates(candidates);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setCandidatesError(
          err instanceof Error ? err.message : "Failed to load schedules"
        );
        setCandidates([]);
      });
    return () => {
      cancelled = true;
    };
  }, [authFetch, booking.tour.id, booking.schedule.id, bookingDateKey]);

  const submitDisabled =
    submitting ||
    (requiresAck && !confirmedAck) ||
    (tab === "existing" && !selectedScheduleId) ||
    (tab === "new" && !newStart);

  async function handleSubmit() {
    setSubmitError(null);
    setSubmitting(true);
    try {
      const body =
        tab === "existing"
          ? { scheduleId: selectedScheduleId }
          : { newSchedule: { startDateTime: localToIsoWithTz(newStart) } };
      // Use a direct fetch so we can read both error.code and error.message —
      // the shared authFetch only surfaces message, which loses the i18n key.
      const token = localStorage.getItem("admin_token");
      const res = await fetch(
        `/api/v1/admin/bookings/${booking.id}/assignment`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(body),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        const code = data?.error?.code as string | undefined;
        const message = data?.error?.message as string | undefined;
        const localized = code ? t(`booking.reassign.errors.${code}`) : "";
        const looksTranslated =
          localized && localized !== `booking.reassign.errors.${code}`;
        setSubmitError(looksTranslated ? localized : message ?? "Reassign failed");
        return;
      }
      await onDone();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Reassign failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <h3 style={{ fontSize: 18, fontWeight: "bold", marginBottom: 16 }}>
          {t("booking.reassign.title")}
        </h3>

        {requiresAck && (
          <div
            style={{
              backgroundColor: "#fffbe6",
              border: "1px solid #f1c40f",
              borderRadius: 4,
              padding: 12,
              marginBottom: 12,
              color: "#7d5a00",
            }}
          >
            <div style={{ marginBottom: 8 }}>{t("booking.reassign.warningConfirmed")}</div>
            <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input
                type="checkbox"
                checked={confirmedAck}
                onChange={(e) => setConfirmedAck(e.target.checked)}
              />
              <span>{t("booking.reassign.confirmCheck")}</span>
            </label>
          </div>
        )}

        <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
          <button
            className={`btn btn-sm ${tab === "existing" ? "btn-primary" : ""}`}
            onClick={() => setTab("existing")}
          >
            {t("booking.reassign.tabExisting")}
          </button>
          <button
            className={`btn btn-sm ${tab === "new" ? "btn-primary" : ""}`}
            onClick={() => setTab("new")}
          >
            {t("booking.reassign.tabNew")}
          </button>
        </div>

        {tab === "existing" && (
          <div style={{ marginBottom: 12 }}>
            {candidates === null && !candidatesError && (
              <p className="text-muted">{t("booking.reassign.loading")}</p>
            )}
            {candidatesError && <p className="form-error">{candidatesError}</p>}
            {candidates && candidates.length === 0 && (
              <p className="text-muted">{t("booking.reassign.noCandidates")}</p>
            )}
            {candidates && candidates.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {candidates.map((slot) => (
                  <label
                    key={slot.scheduleId}
                    className="card"
                    style={{
                      display: "flex",
                      gap: 8,
                      alignItems: "center",
                      cursor: "pointer",
                      backgroundColor:
                        selectedScheduleId === slot.scheduleId
                          ? "#edf2ff"
                          : undefined,
                    }}
                  >
                    <input
                      type="radio"
                      name="reassign-candidate"
                      value={slot.scheduleId ?? ""}
                      checked={selectedScheduleId === slot.scheduleId}
                      onChange={() => setSelectedScheduleId(slot.scheduleId)}
                    />
                    <span style={{ fontWeight: "bold" }}>{slot.time}</span>
                    <span className="text-sm text-muted">
                      {t("booking.reassign.remaining", {
                        remaining: slot.capacity,
                      })}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "new" && (
          <div style={{ marginBottom: 12 }}>
            <label className="form-label">
              {t("booking.reassign.newStartLabel")}
            </label>
            <input
              type="datetime-local"
              className="form-input"
              value={newStart}
              onChange={(e) => setNewStart(e.target.value)}
            />
            <p className="text-sm text-muted" style={{ marginTop: 4 }}>
              {t("booking.reassign.newStartHint", {
                duration: booking.tour.durationMinutes,
              })}
            </p>
          </div>
        )}

        {submitError && <p className="form-error mb-2">{submitError}</p>}

        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="btn btn-primary"
            style={{ flex: 1, justifyContent: "center" }}
            disabled={submitDisabled}
            onClick={handleSubmit}
          >
            {submitting
              ? t("booking.reassign.submitting")
              : t("booking.reassign.submit")}
          </button>
          <button
            className="btn"
            style={{
              flex: 1,
              justifyContent: "center",
              backgroundColor: "#e2e8f0",
              color: "#4a5568",
              border: "1px solid #cbd5e0",
            }}
            onClick={onClose}
          >
            {t("common.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}

interface EditGuestsModalProps {
  booking: Booking;
  t: (key: string, params?: Record<string, string | number>) => string;
  onClose: () => void;
  onDone: () => Promise<void>;
}

function EditGuestsModal({ booking, t, onClose, onDone }: EditGuestsModalProps) {
  const [newGuests, setNewGuests] = useState<number>(booking.numberOfGuests);
  const [confirmedAck, setConfirmedAck] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const requiresAck = booking.status === "CONFIRMED";
  const delta = newGuests - booking.numberOfGuests;
  const projectedTotalCents = booking.unitPriceCents * newGuests;
  const projectedRemaining = booking.schedule.capacity - delta;

  // Client-side guard for obviously invalid input. The server still validates
  // (race conditions, concurrent bookings) — this is purely UX to avoid round
  // trips and the "-1 / 10" preview. See feedback_validation_layers memory.
  const exceedsCapacity = projectedRemaining < 0;
  const exceedsMax = newGuests > booking.schedule.maxParticipants;
  const clientGuardMessage = exceedsCapacity
    ? t("booking.guests.exceedsCapacityHint", {
        remaining: booking.schedule.capacity,
      })
    : exceedsMax
      ? t("booking.guests.exceedsMaxHint", {
          max: booking.schedule.maxParticipants,
        })
      : null;

  const submitDisabled =
    submitting ||
    !Number.isInteger(newGuests) ||
    newGuests < 1 ||
    delta === 0 ||
    exceedsCapacity ||
    exceedsMax ||
    (requiresAck && !confirmedAck);

  async function handleSubmit() {
    setSubmitError(null);
    setSubmitting(true);
    try {
      // Direct fetch (not authFetch) so we can read error.code and translate
      // it into a localized message — same rationale as ReassignModal.
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`/api/v1/admin/bookings/${booking.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ numberOfGuests: newGuests }),
      });
      const data = await res.json();
      if (!res.ok) {
        const code = data?.error?.code as string | undefined;
        const message = data?.error?.message as string | undefined;
        const localized = code ? t(`booking.guests.errors.${code}`) : "";
        const looksTranslated =
          localized && localized !== `booking.guests.errors.${code}`;
        setSubmitError(looksTranslated ? localized : message ?? "Update failed");
        return;
      }
      await onDone();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <h3 style={{ fontSize: 18, fontWeight: "bold", marginBottom: 16 }}>
          {t("booking.guests.modalTitle")}
        </h3>

        {requiresAck && (
          <div
            style={{
              backgroundColor: "#fffbe6",
              border: "1px solid #f1c40f",
              borderRadius: 4,
              padding: 12,
              marginBottom: 12,
              color: "#7d5a00",
            }}
          >
            <div style={{ marginBottom: 8 }}>{t("booking.guests.warningConfirmed")}</div>
            <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input
                type="checkbox"
                checked={confirmedAck}
                onChange={(e) => setConfirmedAck(e.target.checked)}
              />
              <span>{t("booking.guests.confirmCheck")}</span>
            </label>
          </div>
        )}

        <div className="detail-row">
          <div className="detail-label">{t("booking.guests.currentLabel")}</div>
          <div className="detail-value">{booking.numberOfGuests}</div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label className="form-label">{t("booking.guests.newLabel")}</label>
          <input
            type="number"
            className="form-input"
            min={1}
            value={newGuests}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              setNewGuests(Number.isNaN(v) ? 0 : v);
            }}
          />
        </div>

        <div className="detail-row">
          <div className="detail-label">{t("booking.guests.priceChangeLabel")}</div>
          <div className="detail-value">{formatPrice(projectedTotalCents)}</div>
        </div>
        <div className="detail-row">
          <div className="detail-label">{t("booking.guests.remainingChangeLabel")}</div>
          <div className="detail-value">
            {t("booking.remainingSeats", {
              remaining: Math.max(projectedRemaining, 0),
              max: booking.schedule.maxParticipants,
            })}
          </div>
        </div>

        {clientGuardMessage && (
          <p className="form-error mb-2" style={{ marginTop: 8 }}>
            {clientGuardMessage}
          </p>
        )}
        {submitError && <p className="form-error mb-2">{submitError}</p>}

        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button
            className="btn btn-primary"
            style={{ flex: 1, justifyContent: "center" }}
            disabled={submitDisabled}
            title={clientGuardMessage ?? undefined}
            onClick={handleSubmit}
          >
            {submitting ? t("booking.guests.submitting") : t("booking.guests.submit")}
          </button>
          <button
            className="btn"
            style={{
              flex: 1,
              justifyContent: "center",
              backgroundColor: "#e2e8f0",
              color: "#4a5568",
              border: "1px solid #cbd5e0",
            }}
            onClick={onClose}
          >
            {t("common.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}

// `<input type="datetime-local">` returns "YYYY-MM-DDTHH:mm" (no seconds, no TZ).
// Backend requires a timezone suffix — assume the operator's local zone and
// convert to ISO with offset.
function localToIsoWithTz(local: string): string {
  // Treat the local string as wall-clock time in the browser's TZ.
  const dt = new Date(local);
  if (Number.isNaN(dt.getTime())) return local;
  const tzOffsetMin = -dt.getTimezoneOffset();
  const sign = tzOffsetMin >= 0 ? "+" : "-";
  const absMin = Math.abs(tzOffsetMin);
  const hh = String(Math.floor(absMin / 60)).padStart(2, "0");
  const mm = String(absMin % 60).padStart(2, "0");
  // Construct "YYYY-MM-DDTHH:mm:ss±HH:MM" without any UTC normalization.
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}:00${sign}${hh}:${mm}`;
}
