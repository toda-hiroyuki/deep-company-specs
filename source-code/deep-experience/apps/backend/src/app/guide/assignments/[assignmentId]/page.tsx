"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth, statusBadgeClass, statusLabel, formatDateTime, formatPrice } from "@/lib/client-auth";
import { useI18n } from "@/lib/i18n";

interface AssignmentDetail {
  id: string;
  status: string;
  assignedAt: string;
  respondedAt: string | null;
  booking: {
    id: string;
    numberOfGuests: number;
    status: string;
    travelerName: string;
    specialRequests: string | null;
  };
  tour: {
    id: string;
    title: string;
    durationMinutes: number;
    pricePerPersonCents: number;
    currency: string;
  };
  schedule: {
    id: string;
    startDateTime: string;
    endDateTime: string;
    meetingPoint: { lat: number; lng: number; name: string };
  };
}

export default function GuideAssignmentDetailPage() {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const router = useRouter();
  const { loading: authLoading, authFetch } = useAuth("guide");
  const { t } = useI18n();
  const [assignment, setAssignment] = useState<AssignmentDetail | null>(null);
  const [acting, setActing] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [showDecline, setShowDecline] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading) return;
    loadAssignment();
  }, [authLoading]);

  async function loadAssignment() {
    try {
      const data = await authFetch(`/guide/assignments/${assignmentId}`);
      setAssignment(data);
    } catch {
      // handled
    }
  }

  async function handleAccept() {
    setActing(true);
    setError("");
    try {
      await authFetch(`/guide/assignments/${assignmentId}/accept`, { method: "POST" });
      await loadAssignment();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setActing(false);
    }
  }

  async function handleDecline() {
    setActing(true);
    setError("");
    try {
      await authFetch(`/guide/assignments/${assignmentId}/decline`, {
        method: "POST",
        body: JSON.stringify({ reason: declineReason || undefined }),
      });
      setShowDecline(false);
      await loadAssignment();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setActing(false);
    }
  }

  async function handleTourAction(action: "start" | "complete") {
    if (!assignment) return;
    setActing(true);
    setError("");
    try {
      await authFetch(`/guide/bookings/${assignment.booking.id}/${action}`, { method: "POST" });
      await loadAssignment();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setActing(false);
    }
  }

  if (authLoading || !assignment) return <div className="loading">Loading...</div>;

  const isPending = assignment.status === "PENDING";
  const isAccepted = assignment.status === "ACCEPTED";
  const bookingConfirmed = assignment.booking.status === "CONFIRMED";
  const bookingInProgress = assignment.booking.status === "IN_PROGRESS";

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">
          <button className="btn btn-ghost btn-sm" style={{ marginRight: 8 }} onClick={() => router.back()}>←</button>
          Assignment
        </h1>
        <span className={statusBadgeClass(assignment.status)}>{statusLabel(assignment.status, t)}</span>
      </div>

      {error && <p className="form-error mb-2">{error}</p>}

      <div className="card">
        <h2 style={{ fontSize: 18, fontWeight: "bold", marginBottom: 12 }}>{assignment.tour.title}</h2>
        <div className="detail-row">
          <div className="detail-label">Date & Time</div>
          <div className="detail-value">{formatDateTime(assignment.schedule.startDateTime)} - {formatDateTime(assignment.schedule.endDateTime)}</div>
        </div>
        <div className="detail-row">
          <div className="detail-label">Meeting Point</div>
          <div className="detail-value">{assignment.schedule.meetingPoint.name}</div>
        </div>
        <div className="detail-row">
          <div className="detail-label">Duration</div>
          <div className="detail-value">{assignment.tour.durationMinutes} min</div>
        </div>
        <div className="detail-row">
          <div className="detail-label">Price</div>
          <div className="detail-value">{formatPrice(assignment.tour.pricePerPersonCents)} / person</div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ fontSize: 16, fontWeight: "bold", marginBottom: 8 }}>Traveler Info</h3>
        <div className="detail-row">
          <div className="detail-label">Name</div>
          <div className="detail-value">{assignment.booking.travelerName}</div>
        </div>
        <div className="detail-row">
          <div className="detail-label">Guests</div>
          <div className="detail-value">{assignment.booking.numberOfGuests}</div>
        </div>
        <div className="detail-row">
          <div className="detail-label">Booking Status</div>
          <div className="detail-value"><span className={statusBadgeClass(assignment.booking.status)}>{statusLabel(assignment.booking.status, t)}</span></div>
        </div>
        {assignment.booking.specialRequests && (
          <div className="detail-row">
            <div className="detail-label">Requests</div>
            <div className="detail-value">{assignment.booking.specialRequests}</div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div style={{ marginTop: 20 }}>
        {isPending && (
          <div className="flex gap-2">
            <button className="btn btn-success btn-lg" style={{ flex: 1 }} onClick={handleAccept} disabled={acting}>
              {acting ? "..." : "Accept"}
            </button>
            <button className="btn btn-danger btn-lg" style={{ flex: 1 }} onClick={() => setShowDecline(true)} disabled={acting}>
              Decline
            </button>
          </div>
        )}

        {isAccepted && bookingConfirmed && (
          <button className="btn btn-primary btn-lg" style={{ width: "100%" }} onClick={() => handleTourAction("start")} disabled={acting}>
            {acting ? "..." : "Start Tour"}
          </button>
        )}

        {isAccepted && bookingInProgress && (
          <button className="btn btn-success btn-lg" style={{ width: "100%" }} onClick={() => handleTourAction("complete")} disabled={acting}>
            {acting ? "..." : "Complete Tour"}
          </button>
        )}
      </div>

      {showDecline && (
        <div className="modal-overlay" onClick={() => setShowDecline(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: 18, fontWeight: "bold", marginBottom: 16 }}>Decline Assignment</h3>
            <div className="form-group">
              <label className="form-label">Reason (optional)</label>
              <textarea
                className="form-textarea"
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                placeholder="Why are you declining this assignment?"
              />
            </div>
            <div className="flex gap-2 mt-4">
              <button className="btn btn-danger" onClick={handleDecline} disabled={acting}>
                {acting ? "..." : "Confirm Decline"}
              </button>
              <button className="btn btn-ghost" onClick={() => setShowDecline(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
