export const DAILY_AGGREGATION_TIMEZONE = "Asia/Tokyo";

// Bookings in these statuses occupy a seat for daily-capacity aggregation.
// CANCELLED / EXPIRED are excluded (Issue #1 decision).
export const OCCUPYING_BOOKING_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "IN_PROGRESS",
  "COMPLETED",
] as const;

// TourSchedules in these statuses count toward maxDeparturesPerDay.
// CANCELLED is excluded so cancelled slots can be re-created on another time (Issue #1 decision).
export const ACTIVE_SCHEDULE_STATUSES = ["OPEN", "FULL", "COMPLETED"] as const;
