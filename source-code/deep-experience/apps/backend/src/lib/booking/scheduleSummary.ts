// Shared aggregation for admin TourSchedule responses.
// Derives the triple (initialCapacity / currentHeadcount / remainingCapacity)
// and a booking summary from a schedule preloaded with its non-cancelled bookings.

interface BookingPassengerRow {
  id: string;
}

export interface OccupyingBookingRow {
  id: string;
  travelerName: string;
  numberOfGuests: number;
  status: string;
  passengers: BookingPassengerRow[];
}

export interface ScheduleForSummary {
  id: string;
  tourId: string;
  startDateTime: Date;
  endDateTime: Date;
  capacity: number;
  status: string;
  sourceRuleId: string | null;
  bookings: OccupyingBookingRow[];
}

export interface BookingSummary {
  bookingId: string;
  travelerName: string;
  headcount: number;
  status: string;
}

export interface ScheduleSummary {
  scheduleId: string;
  tourId: string;
  startDateTime: string;
  endDateTime: string;
  initialCapacity: number;
  currentHeadcount: number;
  remainingCapacity: number;
  // Kept as a mirror of remainingCapacity for legacy UI clients.
  capacity: number;
  bookingCount: number;
  status: string;
  sourceRuleId: string | null;
  bookings: BookingSummary[];
}

// Legacy bookings predate BookingPassenger rows — fall back to the deprecated
// numberOfGuests column so those seats are not silently dropped from the
// occupancy count.
function getBookingHeadcount(booking: OccupyingBookingRow): number {
  return booking.passengers.length > 0
    ? booking.passengers.length
    : booking.numberOfGuests;
}

export function summarizeSchedule(schedule: ScheduleForSummary): ScheduleSummary {
  const bookings: BookingSummary[] = schedule.bookings.map((b) => ({
    bookingId: b.id,
    travelerName: b.travelerName,
    headcount: getBookingHeadcount(b),
    status: b.status,
  }));

  const currentHeadcount = bookings.reduce((sum, b) => sum + b.headcount, 0);
  const remainingCapacity = schedule.capacity;
  const initialCapacity = remainingCapacity + currentHeadcount;

  return {
    scheduleId: schedule.id,
    tourId: schedule.tourId,
    startDateTime: schedule.startDateTime.toISOString(),
    endDateTime: schedule.endDateTime.toISOString(),
    initialCapacity,
    currentHeadcount,
    remainingCapacity,
    capacity: remainingCapacity,
    bookingCount: bookings.length,
    status: schedule.status,
    sourceRuleId: schedule.sourceRuleId,
    bookings,
  };
}

// Prisma include fragment used by list/detail endpoints to load the occupancy
// data required by summarizeSchedule.
export const scheduleSummaryInclude = {
  bookings: {
    where: { status: { not: "CANCELLED" } },
    select: {
      id: true,
      travelerName: true,
      numberOfGuests: true,
      status: true,
      passengers: { select: { id: true } },
    },
  },
} as const;
