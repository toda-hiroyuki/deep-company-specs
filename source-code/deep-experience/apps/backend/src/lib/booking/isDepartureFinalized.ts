// Shared departure-finalization predicate.
//
// A departure is considered "finalized" once the free-cancellation deadline
// has passed, computed as: startDateTime - freeCancellationDeadlineHours.
//
// Used by three code paths to keep the invariant aligned:
//   - Batch job (finalizeBookings) — flips Booking.assignmentState TENTATIVE→FINALIZED
//   - On-read guards (resolveScheduleAssignment, reassignBookingSchedule) —
//     reject operations even when the DB still shows TENTATIVE (bridges batch lag)
//   - UI rendering — may show deadline hints
//
// freeCancellationDeadlineHours === null means "no free-cancellation deadline"
// per operator intent. Such tours never transition to FINALIZED through this
// predicate; batch callers emit a WARN when they see TENTATIVE rows under a
// null-deadline tour (operator likely forgot to configure it).
//
// The FINALIZE_GUARD_ENABLED env var (default "true") gates both on-read guards
// and the batch at a global flag so rollback is one deploy away.

export type FinalizedInput = {
  startDateTime: Date;
  freeCancellationDeadlineHours: number | null;
  now: Date;
};

export function isDepartureFinalized(input: FinalizedInput): boolean {
  if (process.env.FINALIZE_GUARD_ENABLED === "false") return false;
  if (input.freeCancellationDeadlineHours === null) return false;
  const deadlineMs =
    input.startDateTime.getTime() -
    input.freeCancellationDeadlineHours * 60 * 60 * 1000;
  return deadlineMs <= input.now.getTime();
}

export function computeFinalizeAt(
  startDateTime: Date,
  freeCancellationDeadlineHours: number | null
): Date | null {
  if (freeCancellationDeadlineHours === null) return null;
  return new Date(
    startDateTime.getTime() - freeCancellationDeadlineHours * 60 * 60 * 1000
  );
}
