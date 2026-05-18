import { describe, expect, it } from "vitest";
import { checkCloseOut } from "../checkCloseOut";
import type { AssessmentContext } from "../types";

const baseCtx = (overrides: Partial<AssessmentContext> = {}): AssessmentContext => ({
  tour: {
    maxParticipants: 100,
    dailyCapacity: null,
    maxDeparturesPerDay: null,
    bookingCutoffMinutes: null,
  },
  applicableRule: null,
  schedule: null,
  closeOut: { isClosed: false },
  daily: { dateKey: "2026-04-19", bookedGuests: 0, departureCount: 0 },
  now: new Date("2026-04-19T00:00:00Z"),
  input: {
    tourId: "tour-1",
    startDateTime: new Date("2026-04-20T01:00:00Z"),
    requestedGuests: 2,
    isNewDeparture: false,
  },
  ...overrides,
});

describe("checkCloseOut", () => {
  it("passes when the requested slot is not closed out", () => {
    expect(checkCloseOut(baseCtx())).toEqual({ ok: true });
  });

  it("rejects with SCHEDULE_CLOSED_OUT when closeOut is set", () => {
    expect(
      checkCloseOut(baseCtx({ closeOut: { isClosed: true } }))
    ).toEqual({ ok: false, reason: "SCHEDULE_CLOSED_OUT" });
  });
});
