// --- Tour Types ---

export const TOUR_TYPES = ["GROUP", "PRIVATE"] as const;
export type TourType = (typeof TOUR_TYPES)[number];

// --- Status Types ---

export const SCHEDULE_STATUSES = [
  "OPEN",
  "FULL",
  "CANCELLED",
  "COMPLETED",
] as const;
export type ScheduleStatus = (typeof SCHEDULE_STATUSES)[number];

export const BOOKING_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "CANCELLED",
  "IN_PROGRESS",
  "COMPLETED",
  "EXPIRED",
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const ASSIGNMENT_STATUSES = [
  "PENDING",
  "ACCEPTED",
  "DECLINED",
] as const;
export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number];

// Booking<->TourSchedule assignment lifecycle (Issue #5).
// TENTATIVE = supply-side may still reassign; FINALIZED = locked.
export const ASSIGNMENT_STATES = ["TENTATIVE", "FINALIZED"] as const;
export type AssignmentState = (typeof ASSIGNMENT_STATES)[number];

// --- API Response Types ---

export interface MeetingPoint {
  lat: number;
  lng: number;
  name: string;
}

export interface TourSummary {
  id: string;
  title: string;
  category: string;
  tourType: TourType;
  meetingPoint: MeetingPoint;
  durationMinutes: number;
  pricePerPersonCents: number;
  currency: string;
  maxParticipants: number;
  imageUrl: string;
  nextSchedule: ScheduleSummary | null;
  schedulesCount: number;
  distanceKm: number;
}

export interface ScheduleSummary {
  id: string;
  startDateTime: string;
  endDateTime: string;
  remainingSlots: number;
  status: ScheduleStatus;
}

export interface TourDetail {
  id: string;
  title: string;
  description: string;
  imageUrls: string[];
  category: string;
  tourType: TourType;
  meetingPoint: MeetingPoint;
  durationMinutes: number;
  pricePerPersonCents: number;
  currency: string;
  maxParticipants: number;
}

export interface BookingSummary {
  id: string;
  status: BookingStatus;
  assignmentState: AssignmentState;
  numberOfGuests: number;
  tour: {
    title: string;
    imageUrl: string;
  };
  schedule: {
    startDateTime: string;
    meetingPointName: string;
  };
}

export interface BookingDetail {
  id: string;
  status: BookingStatus;
  assignmentState: AssignmentState;
  travelerName: string;
  travelerEmail: string;
  numberOfGuests: number;
  specialRequests: string | null;
  totalPriceCents: number;
  currency: string;
  createdAt: string;
  tour: {
    id: string;
    title: string;
    imageUrl: string;
  };
  schedule: {
    id: string;
    startDateTime: string;
    endDateTime: string;
    meetingPoint: MeetingPoint;
  };
  guide: {
    name: string;
    profileImageUrl: string | null;
  } | null;
}

// --- API Request Types ---

// Issue #5: booking creation is supply-side driven — the client submits the
// desired tour + start time, the server picks or spawns a TourSchedule.
export interface CreateBookingRequest {
  tourId: string;
  // UTC ISO 8601 string with timezone designator (e.g. "2026-04-19T01:00:00Z").
  requestedStartDateTime: string;
  travelerName: string;
  travelerEmail: string;
  travelerPhone?: string;
  numberOfGuests: number;
  specialRequests?: string;
}

export interface TourSearchParams {
  lat: number;
  lng: number;
  radiusKm?: number;
  category?: string;
  dateFrom?: string;
  dateTo?: string;
  tourType?: TourType;
  limit?: number;
  offset?: number;
}

// --- Error Types ---

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: { field: string; message: string }[];
  };
}
