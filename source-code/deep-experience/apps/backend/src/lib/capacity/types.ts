// Booking Rejection Reason Codes
//
// Evaluation order matches the check order in assessBookingAcceptance:
//   0. SCHEDULE_CLOSED_OUT       - CloseOut matches the requested (JST date, hour:minute)
//   1. TIME_SLOT_FULL            - TourSchedule.capacity < requestedGuests
//   2. DAILY_CAPACITY_EXCEEDED   - Tour.dailyCapacity < bookedGuests + requestedGuests (JST day bucket)
//   3. MAX_DEPARTURES_EXCEEDED   - Tour.maxDeparturesPerDay < departureCount + 1 (only when isNewDeparture=true)
//   4. MIN_PARTICIPANTS_NOT_MET  - CapacityRule min constraints unmet (min per booking / min overall)
//   4. MAX_PARTICIPANTS_EXCEEDED - Tour.maxParticipants or CapacityRule.maxPerBooking exceeded
//   5. BOOKING_CUTOFF_EXCEEDED   - (startDateTime - now) < bookingCutoffMinutes
//   6. DEPARTURE_FINALIZED       - Free-cancellation deadline passed; new
//                                   departures cannot be spawned (existing
//                                   TourSchedules can still accept bookings).
//                                   Emitted by resolveScheduleAssignment /
//                                   reassignBookingSchedule, not by the
//                                   shared check chain (not scheduled into
//                                   assessBookingAcceptance).
export type BookingRejectionReason =
  | "SCHEDULE_CLOSED_OUT"
  | "TIME_SLOT_FULL"
  | "DAILY_CAPACITY_EXCEEDED"
  | "MAX_DEPARTURES_EXCEEDED"
  | "MIN_PARTICIPANTS_NOT_MET"
  | "MAX_PARTICIPANTS_EXCEEDED"
  | "BOOKING_CUTOFF_EXCEEDED"
  | "DEPARTURE_FINALIZED";

export type AssessmentInput = {
  tourId: string;
  scheduleId?: string;
  startDateTime: Date;
  requestedGuests: number;
  isNewDeparture: boolean;
  // Injectable current time. Defaults to new Date() when omitted.
  now?: Date;
};

export type AssessmentResult =
  | { ok: true }
  | { ok: false; reason: BookingRejectionReason };

export type TourInventorySettings = {
  maxParticipants: number;
  dailyCapacity: number | null;
  maxDeparturesPerDay: number | null;
  bookingCutoffMinutes: number | null;
};

export type CapacityRuleSettings = {
  id: string;
  minParticipants: number;
  maxPerBooking: number | null;
  minPerBooking: number;
  priority: number;
  isActive: boolean;
};

export type ScheduleCapacityContext = {
  scheduleId: string;
  remainingCapacity: number;
  currentGuests: number;
  sourceRuleId: string | null;
};

export type DailyAggregation = {
  dateKey: string;
  bookedGuests: number;
  departureCount: number;
};

export type CloseOutMatch = {
  // True when any CloseOut row covers the requested (JST date, hour:minute).
  isClosed: boolean;
};

export type AssessmentContext = {
  tour: TourInventorySettings;
  applicableRule: CapacityRuleSettings | null;
  schedule: ScheduleCapacityContext | null;
  daily: DailyAggregation;
  closeOut: CloseOutMatch;
  now: Date;
  input: AssessmentInput;
};
