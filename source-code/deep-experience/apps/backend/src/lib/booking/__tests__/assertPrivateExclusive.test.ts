import { beforeEach, describe, expect, it, vi } from "vitest";
import { assertPrivateExclusive } from "../assertPrivateExclusive";
import { PrivateScheduleAlreadyBookedError } from "../errors";
import { OCCUPYING_BOOKING_STATUSES } from "@/lib/capacity/constants";

type BookingFindFirst = (...args: unknown[]) => Promise<{ id: string } | null>;

function makeDb(findFirstImpl: BookingFindFirst) {
  const findFirst = vi.fn(findFirstImpl);
  return {
    db: { booking: { findFirst } } as unknown as Parameters<
      typeof assertPrivateExclusive
    >[0],
    findFirst,
  };
}

const SCHEDULE_ID = "schedule-1";

describe("assertPrivateExclusive", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("UT-1: PRIVATE + no existing booking → resolves", async () => {
    const { db, findFirst } = makeDb(async () => null);
    await expect(
      assertPrivateExclusive(db, {
        tourScheduleId: SCHEDULE_ID,
        tourType: "PRIVATE",
      })
    ).resolves.toBeUndefined();
    expect(findFirst).toHaveBeenCalledTimes(1);
  });

  it("UT-2: PRIVATE + existing PENDING → throws", async () => {
    const { db } = makeDb(async () => ({ id: "booking-1" }));
    await expect(
      assertPrivateExclusive(db, {
        tourScheduleId: SCHEDULE_ID,
        tourType: "PRIVATE",
      })
    ).rejects.toBeInstanceOf(PrivateScheduleAlreadyBookedError);
  });

  it("UT-3: PRIVATE + existing CONFIRMED → throws", async () => {
    const { db } = makeDb(async () => ({ id: "booking-2" }));
    await expect(
      assertPrivateExclusive(db, {
        tourScheduleId: SCHEDULE_ID,
        tourType: "PRIVATE",
      })
    ).rejects.toBeInstanceOf(PrivateScheduleAlreadyBookedError);
  });

  it("UT-4: PRIVATE + only CANCELLED booking → resolves (CANCELLED excluded from occupying statuses)", async () => {
    // findFirst with status IN (OCCUPYING_BOOKING_STATUSES) never matches CANCELLED
    const { db, findFirst } = makeDb(async () => null);
    await expect(
      assertPrivateExclusive(db, {
        tourScheduleId: SCHEDULE_ID,
        tourType: "PRIVATE",
      })
    ).resolves.toBeUndefined();
    expect(findFirst).toHaveBeenCalledTimes(1);
  });

  it("UT-5: PRIVATE + only EXPIRED booking → resolves (EXPIRED excluded from occupying statuses)", async () => {
    const { db, findFirst } = makeDb(async () => null);
    await expect(
      assertPrivateExclusive(db, {
        tourScheduleId: SCHEDULE_ID,
        tourType: "PRIVATE",
      })
    ).resolves.toBeUndefined();
    expect(findFirst).toHaveBeenCalledTimes(1);
  });

  it("UT-6: GROUP + existing bookings → resolves without issuing any Prisma query", async () => {
    const { db, findFirst } = makeDb(async () => ({ id: "booking-n" }));
    await expect(
      assertPrivateExclusive(db, {
        tourScheduleId: SCHEDULE_ID,
        tourType: "GROUP",
      })
    ).resolves.toBeUndefined();
    expect(findFirst).not.toHaveBeenCalled();
  });

  it("UT-7: thrown error carries tourScheduleId and code", async () => {
    const { db } = makeDb(async () => ({ id: "booking-x" }));
    try {
      await assertPrivateExclusive(db, {
        tourScheduleId: SCHEDULE_ID,
        tourType: "PRIVATE",
      });
      expect.fail("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(PrivateScheduleAlreadyBookedError);
      const typed = err as PrivateScheduleAlreadyBookedError;
      expect(typed.code).toBe("PRIVATE_SCHEDULE_ALREADY_BOOKED");
      expect(typed.tourScheduleId).toBe(SCHEDULE_ID);
    }
  });

  it("UT-8: Prisma query uses OCCUPYING_BOOKING_STATUSES in where.status.in", async () => {
    const { db, findFirst } = makeDb(async () => null);
    await assertPrivateExclusive(db, {
      tourScheduleId: SCHEDULE_ID,
      tourType: "PRIVATE",
    });
    expect(findFirst).toHaveBeenCalledWith({
      where: {
        tourScheduleId: SCHEDULE_ID,
        status: { in: [...OCCUPYING_BOOKING_STATUSES] },
      },
      select: { id: true },
    });
  });
});
