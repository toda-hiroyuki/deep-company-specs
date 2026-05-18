import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => {
  return {
    prismaMock: {
      booking: {
        findMany: vi.fn(),
        updateMany: vi.fn(),
      },
    },
  };
});

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { finalizeBookings } from "../finalizeBookings";

// 2026-05-01T10:00:00Z departure, 24h deadline → deadline at 2026-04-30T10:00.
const DEPARTURE = new Date("2026-05-01T10:00:00Z");
const BEFORE_DEADLINE = new Date("2026-04-29T10:00:00Z");
const PAST_DEADLINE = new Date("2026-04-30T11:00:00Z");

type CandidateShape = {
  id: string;
  tourSchedule: {
    startDateTime: Date;
    tour: { freeCancellationDeadlineHours: number | null };
  };
};

function candidate(
  id: string,
  hours: number | null,
  startDateTime: Date = DEPARTURE
): CandidateShape {
  return {
    id,
    tourSchedule: {
      startDateTime,
      tour: { freeCancellationDeadlineHours: hours },
    },
  };
}

describe("finalizeBookings", () => {
  beforeEach(() => {
    prismaMock.booking.findMany.mockReset();
    prismaMock.booking.updateMany.mockReset();
    delete process.env.FINALIZE_GUARD_ENABLED;
  });

  it("flips only TENTATIVE bookings past the deadline under non-null tours", async () => {
    prismaMock.booking.findMany.mockResolvedValueOnce([
      candidate("b-past", 24, DEPARTURE),
      candidate("b-future", 24, new Date("2026-05-10T10:00:00Z")),
      candidate("b-null", null, DEPARTURE),
    ]);
    prismaMock.booking.updateMany.mockResolvedValueOnce({ count: 1 });

    const result = await finalizeBookings(PAST_DEADLINE);

    expect(result.processedCount).toBe(1);
    expect(result.warnCount).toBe(1);
    expect(prismaMock.booking.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["b-past"] } },
      data: { assignmentState: "FINALIZED" },
    });
    expect((result.payload as { finalizedBookingIds: string[] }).finalizedBookingIds).toEqual([
      "b-past",
    ]);
    expect((result.payload as { warnBookingIds: string[] }).warnBookingIds).toEqual([
      "b-null",
    ]);
  });

  it("does nothing when the deadline has not passed", async () => {
    prismaMock.booking.findMany.mockResolvedValueOnce([
      candidate("b-future", 24, DEPARTURE),
    ]);

    const result = await finalizeBookings(BEFORE_DEADLINE);

    expect(result.processedCount).toBe(0);
    expect(prismaMock.booking.updateMany).not.toHaveBeenCalled();
  });

  it("counts null-deadline bookings as WARN without flipping", async () => {
    prismaMock.booking.findMany.mockResolvedValueOnce([
      candidate("b-null-1", null, DEPARTURE),
      candidate("b-null-2", null, DEPARTURE),
    ]);

    const result = await finalizeBookings(PAST_DEADLINE);

    expect(result.processedCount).toBe(0);
    expect(result.warnCount).toBe(2);
    expect(prismaMock.booking.updateMany).not.toHaveBeenCalled();
  });

  it("short-circuits when FINALIZE_GUARD_ENABLED=false", async () => {
    process.env.FINALIZE_GUARD_ENABLED = "false";

    const result = await finalizeBookings(PAST_DEADLINE);

    expect(result.processedCount).toBe(0);
    expect(result.warnCount).toBe(0);
    expect(prismaMock.booking.findMany).not.toHaveBeenCalled();
  });
});
