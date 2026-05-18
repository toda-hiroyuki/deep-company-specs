import { prisma } from "@/lib/prisma";

// Common wrapper around a batch / delayed job.
//
// Writes a JobExecutionLog row before fn runs (RUNNING) and flips it to
// SUCCESS or FAILED on completion. fn's returned shape is persisted in
// processedCount / warnCount / payload so downstream ops can inspect what
// happened without re-running the job.
//
// payload is constrained to identifiers (no PII) per plan §8. Runtime doesn't
// enforce the shape — it's a convention callers must respect.

export type JobResult = {
  processedCount: number;
  warnCount?: number;
  payload?: unknown;
};

export type RunJobOutcome = {
  logId: string;
  status: "SUCCESS" | "FAILED";
  durationMs: number;
  result: JobResult | null;
  errorMessage: string | null;
};

export async function runJob(
  jobName: string,
  fn: () => Promise<JobResult>
): Promise<RunJobOutcome> {
  const startedAt = new Date();
  const log = await prisma.jobExecutionLog.create({
    data: { jobName, status: "RUNNING", startedAt },
  });

  try {
    const result = await fn();
    const finishedAt = new Date();
    await prisma.jobExecutionLog.update({
      where: { id: log.id },
      data: {
        status: "SUCCESS",
        finishedAt,
        processedCount: result.processedCount,
        warnCount: result.warnCount ?? 0,
        payload:
          result.payload === undefined ? null : JSON.stringify(result.payload),
      },
    });
    return {
      logId: log.id,
      status: "SUCCESS",
      durationMs: finishedAt.getTime() - startedAt.getTime(),
      result,
      errorMessage: null,
    };
  } catch (err) {
    const finishedAt = new Date();
    const message = err instanceof Error ? err.message : String(err);
    await prisma.jobExecutionLog.update({
      where: { id: log.id },
      data: {
        status: "FAILED",
        finishedAt,
        errorMessage: message.slice(0, 2000),
      },
    });
    return {
      logId: log.id,
      status: "FAILED",
      durationMs: finishedAt.getTime() - startedAt.getTime(),
      result: null,
      errorMessage: message,
    };
  }
}
