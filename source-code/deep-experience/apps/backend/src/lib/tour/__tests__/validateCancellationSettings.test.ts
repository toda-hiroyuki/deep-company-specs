import { describe, expect, it } from "vitest";
import { validateCancellationSettings } from "../validateCancellationSettings";

describe("validateCancellationSettings", () => {
  it("returns [] when either value is null", () => {
    expect(
      validateCancellationSettings({
        bookingCutoffMinutes: null,
        freeCancellationDeadlineHours: 24,
      })
    ).toEqual([]);
    expect(
      validateCancellationSettings({
        bookingCutoffMinutes: 60,
        freeCancellationDeadlineHours: null,
      })
    ).toEqual([]);
  });

  it("returns [] when booking cutoff sits inside the free-cancellation window", () => {
    // cutoff 2h (120 min), free 24h → valid (deadline >= cutoff).
    expect(
      validateCancellationSettings({
        bookingCutoffMinutes: 120,
        freeCancellationDeadlineHours: 24,
      })
    ).toEqual([]);
  });

  it("returns [] when values are equal on the minute", () => {
    expect(
      validateCancellationSettings({
        bookingCutoffMinutes: 1440,
        freeCancellationDeadlineHours: 24,
      })
    ).toEqual([]);
  });

  it("returns an issue when cutoff is stricter (further from departure) than the deadline", () => {
    // cutoff 30h (1800 min), free 24h → invalid.
    const issues = validateCancellationSettings({
      bookingCutoffMinutes: 1800,
      freeCancellationDeadlineHours: 24,
    });
    expect(issues).toHaveLength(1);
    expect(issues[0].field).toBe("bookingCutoffMinutes");
  });

  it("merges with existing values on partial update", () => {
    // Existing: cutoff 60 / deadline 24h.
    // Patch only cutoff to 1800 (30h) → invalid.
    const issues = validateCancellationSettings(
      {
        bookingCutoffMinutes: 1800,
        freeCancellationDeadlineHours: undefined,
      },
      {
        bookingCutoffMinutes: 60,
        freeCancellationDeadlineHours: 24,
      }
    );
    expect(issues).toHaveLength(1);
  });

  it("respects explicit null in patch", () => {
    const issues = validateCancellationSettings(
      {
        bookingCutoffMinutes: 1800,
        freeCancellationDeadlineHours: null,
      },
      {
        bookingCutoffMinutes: 60,
        freeCancellationDeadlineHours: 24,
      }
    );
    expect(issues).toEqual([]);
  });
});
