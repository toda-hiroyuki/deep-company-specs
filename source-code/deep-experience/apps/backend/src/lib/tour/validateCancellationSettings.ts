// Validates the coexistence of bookingCutoffMinutes and
// freeCancellationDeadlineHours on a Tour.
//
// Reason for the rule: if the booking cutoff is stricter than (i.e. further
// from departure than) the free-cancellation deadline, operators would be
// accepting new bookings under a FINALIZED time bucket — see
// business-rules.md §7 for the full rationale. Operators confirmed this is
// always a configuration error and should be blocked at the admin API.
//
// Evaluates using merged values: for PATCH-style updates the caller passes
// existing Tour values plus the delta so we can validate the post-update
// state.

export type CancellationSettingsInput = {
  bookingCutoffMinutes: number | null | undefined;
  freeCancellationDeadlineHours: number | null | undefined;
};

export type CancellationSettingsExisting = {
  bookingCutoffMinutes: number | null;
  freeCancellationDeadlineHours: number | null;
};

export type ValidationIssue = { field: string; message: string };

// Returns [] when valid. Use in concert with existing 400 VALIDATION_ERROR flow.
export function validateCancellationSettings(
  input: CancellationSettingsInput,
  existing?: CancellationSettingsExisting
): ValidationIssue[] {
  const bookingCutoffMinutes =
    input.bookingCutoffMinutes === undefined
      ? existing?.bookingCutoffMinutes ?? null
      : input.bookingCutoffMinutes;
  const freeCancellationDeadlineHours =
    input.freeCancellationDeadlineHours === undefined
      ? existing?.freeCancellationDeadlineHours ?? null
      : input.freeCancellationDeadlineHours;

  if (bookingCutoffMinutes === null || freeCancellationDeadlineHours === null) {
    return [];
  }
  if (bookingCutoffMinutes > freeCancellationDeadlineHours * 60) {
    return [
      {
        field: "bookingCutoffMinutes",
        message:
          "bookingCutoffMinutes must be less than or equal to freeCancellationDeadlineHours * 60 (free-cancellation deadline must not precede booking cutoff)",
      },
    ];
  }
  return [];
}
