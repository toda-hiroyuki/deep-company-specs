export class PrivateScheduleAlreadyBookedError extends Error {
  readonly code = "PRIVATE_SCHEDULE_ALREADY_BOOKED" as const;

  constructor(readonly tourScheduleId: string) {
    super(`Private tour schedule ${tourScheduleId} is already booked`);
    this.name = "PrivateScheduleAlreadyBookedError";
  }
}

export class BookingFinalizedError extends Error {
  readonly code = "BOOKING_FINALIZED" as const;

  constructor(readonly bookingId: string) {
    super(`Booking ${bookingId} is FINALIZED and cannot be reassigned`);
    this.name = "BookingFinalizedError";
  }
}

export class ReassignTargetSameAsCurrentError extends Error {
  readonly code = "TARGET_SAME_AS_CURRENT" as const;

  constructor(readonly tourScheduleId: string) {
    super(`Target schedule ${tourScheduleId} is the booking's current schedule`);
    this.name = "ReassignTargetSameAsCurrentError";
  }
}
