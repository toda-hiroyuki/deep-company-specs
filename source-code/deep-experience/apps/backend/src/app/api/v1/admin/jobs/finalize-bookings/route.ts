import { NextRequest, NextResponse } from "next/server";
import { runJob } from "@/lib/jobs/runJob";
import { finalizeBookings } from "@/lib/jobs/finalizeBookings";
import { jsonError, jsonOk } from "@/lib/response";

// POST /api/v1/admin/jobs/finalize-bookings
//
// Triggered by Vercel Cron (schedule configured in apps/backend/vercel.json).
// Vercel attaches "Authorization: Bearer $CRON_SECRET" automatically. In
// non-production environments the secret may be absent — we allow the call
// through so developers can exercise the batch with a plain curl.
//
// The handler is intentionally thin: all state changes live in runJob +
// finalizeBookings so they can be unit-tested without HTTP plumbing.
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization") ?? "";
  const configuredSecret = process.env.CRON_SECRET;

  if (process.env.NODE_ENV === "production") {
    if (!configuredSecret) {
      return jsonError(
        "CRON_SECRET_NOT_CONFIGURED",
        "CRON_SECRET is required in production",
        500
      );
    }
    if (authHeader !== `Bearer ${configuredSecret}`) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Invalid cron token" } },
        { status: 401 }
      );
    }
  } else if (configuredSecret) {
    // Dev but secret is set — still enforce it so local curls don't skip auth
    // once a developer copies the prod secret locally.
    if (authHeader !== `Bearer ${configuredSecret}`) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Invalid cron token" } },
        { status: 401 }
      );
    }
  }

  const outcome = await runJob("FINALIZE_BOOKINGS", () => finalizeBookings());

  if (outcome.status === "FAILED") {
    return jsonError(
      "JOB_FAILED",
      outcome.errorMessage ?? "Job execution failed",
      500,
      [{ field: "logId", message: outcome.logId }]
    );
  }

  return jsonOk({
    logId: outcome.logId,
    status: outcome.status,
    durationMs: outcome.durationMs,
    processedCount: outcome.result?.processedCount ?? 0,
    warnCount: outcome.result?.warnCount ?? 0,
  });
}
