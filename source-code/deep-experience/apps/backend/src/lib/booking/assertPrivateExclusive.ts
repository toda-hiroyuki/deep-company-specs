import type { Prisma, PrismaClient } from "@prisma/client";
import { OCCUPYING_BOOKING_STATUSES } from "@/lib/capacity/constants";
import { PrivateScheduleAlreadyBookedError } from "./errors";

// NOTE: Race condition mitigation (SERIALIZABLE / SELECT FOR UPDATE / advisory lock) is
// deferred to a separate tech-debt issue tracked for the Phase 1 Postgres migration.
// The current SQLite dev environment serializes writers so this single-query check is safe.

type DbClient = PrismaClient | Prisma.TransactionClient;

export async function assertPrivateExclusive(
  db: DbClient,
  params: { tourScheduleId: string; tourType: string }
): Promise<void> {
  if (params.tourType !== "PRIVATE") return;

  const existing = await db.booking.findFirst({
    where: {
      tourScheduleId: params.tourScheduleId,
      status: { in: [...OCCUPYING_BOOKING_STATUSES] },
    },
    select: { id: true },
  });

  if (existing) {
    throw new PrivateScheduleAlreadyBookedError(params.tourScheduleId);
  }
}
