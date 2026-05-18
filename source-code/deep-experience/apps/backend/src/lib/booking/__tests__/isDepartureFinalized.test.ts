import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  computeFinalizeAt,
  isDepartureFinalized,
} from "../isDepartureFinalized";

// 2026-05-01T10:00:00Z departure.
const START = new Date("2026-05-01T10:00:00Z");

describe("isDepartureFinalized", () => {
  const originalFlag = process.env.FINALIZE_GUARD_ENABLED;

  beforeEach(() => {
    delete process.env.FINALIZE_GUARD_ENABLED;
  });

  afterEach(() => {
    if (originalFlag === undefined) {
      delete process.env.FINALIZE_GUARD_ENABLED;
    } else {
      process.env.FINALIZE_GUARD_ENABLED = originalFlag;
    }
  });

  it("returns false when freeCancellationDeadlineHours is null (no deadline configured)", () => {
    expect(
      isDepartureFinalized({
        startDateTime: START,
        freeCancellationDeadlineHours: null,
        now: new Date("2026-05-01T09:59:00Z"),
      })
    ).toBe(false);
  });

  it("returns true exactly at the deadline (boundary)", () => {
    // 24h deadline → deadline at 2026-04-30T10:00:00Z.
    const now = new Date("2026-04-30T10:00:00Z");
    expect(
      isDepartureFinalized({
        startDateTime: START,
        freeCancellationDeadlineHours: 24,
        now,
      })
    ).toBe(true);
  });

  it("returns true past the deadline", () => {
    expect(
      isDepartureFinalized({
        startDateTime: START,
        freeCancellationDeadlineHours: 24,
        now: new Date("2026-04-30T11:00:00Z"),
      })
    ).toBe(true);
  });

  it("returns false before the deadline", () => {
    expect(
      isDepartureFinalized({
        startDateTime: START,
        freeCancellationDeadlineHours: 24,
        now: new Date("2026-04-30T09:59:59Z"),
      })
    ).toBe(false);
  });

  it("hours=0 means deadline is the departure instant", () => {
    expect(
      isDepartureFinalized({
        startDateTime: START,
        freeCancellationDeadlineHours: 0,
        now: new Date("2026-05-01T09:59:00Z"),
      })
    ).toBe(false);
    expect(
      isDepartureFinalized({
        startDateTime: START,
        freeCancellationDeadlineHours: 0,
        now: new Date("2026-05-01T10:00:00Z"),
      })
    ).toBe(true);
  });

  it("returns false when FINALIZE_GUARD_ENABLED=false, regardless of input", () => {
    process.env.FINALIZE_GUARD_ENABLED = "false";
    expect(
      isDepartureFinalized({
        startDateTime: START,
        freeCancellationDeadlineHours: 24,
        now: new Date("2026-04-30T11:00:00Z"),
      })
    ).toBe(false);
  });
});

describe("computeFinalizeAt", () => {
  it("returns null when hours is null", () => {
    expect(computeFinalizeAt(START, null)).toBeNull();
  });

  it("returns startDateTime - hours when configured", () => {
    const deadline = computeFinalizeAt(START, 24);
    expect(deadline?.toISOString()).toBe("2026-04-30T10:00:00.000Z");
  });
});
