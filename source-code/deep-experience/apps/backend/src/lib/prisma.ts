import { PrismaClient } from "@prisma/client";

// Reuse a single PrismaClient across hot reloads (dev) and Serverless invocations
// on the same warm container (prod). On Vercel, pair this with PgBouncer
// (Supabase Pooler at port 6543, ?pgbouncer=true&connection_limit=1) to avoid
// the "too many connections" trap when many concurrent Lambdas spin up.

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "production"
        ? ["error", "warn"]
        : ["error", "warn"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
