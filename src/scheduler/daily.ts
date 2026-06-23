import { fileURLToPath } from "node:url";
import path from "node:path";
import { env } from "../config/env.js";
import { runIngestion, type IngestionResult } from "../ingestion/run.js";

export type ScheduleArgs = {
  once: boolean;
  daemon: boolean;
};

export function parseScheduleArgs(argv: string[]): ScheduleArgs {
  const once = argv.includes("--once");
  return {
    once,
    daemon: argv.includes("--daemon") || !once,
  };
}

export function buildCronExpression(hour: number, minute: number): string {
  return `${minute} ${hour} * * *`;
}

function logEvent(event: string, payload: Record<string, unknown>): void {
  console.log(JSON.stringify({ event, at: new Date().toISOString(), ...payload }));
}

export async function runScheduledIngestionOnce(): Promise<IngestionResult> {
  const startedAt = Date.now();
  logEvent("scheduled_ingestion_start", {
    timezone: env.ingestionScheduleTimezone,
    hour: env.ingestionScheduleHour,
    minute: env.ingestionScheduleMinute,
  });

  try {
    const result = await runIngestion();
    logEvent("scheduled_ingestion_success", {
      durationMs: Date.now() - startedAt,
      fetched: result.fetched,
      parsed: result.parsed,
      chunks: result.chunks,
      indexed: result.indexed ?? null,
      collection: result.collection ?? null,
    });
    return result;
  } catch (firstError) {
    const firstMessage =
      firstError instanceof Error ? firstError.message : String(firstError);
    logEvent("scheduled_ingestion_retry", { error: firstMessage });

    try {
      const result = await runIngestion({ skipFetch: true });
      logEvent("scheduled_ingestion_success_after_retry", {
        durationMs: Date.now() - startedAt,
        fetched: result.fetched,
        parsed: result.parsed,
        chunks: result.chunks,
        indexed: result.indexed ?? null,
        collection: result.collection ?? null,
      });
      return result;
    } catch (retryError) {
      const retryMessage =
        retryError instanceof Error ? retryError.message : String(retryError);
      logEvent("scheduled_ingestion_failed", {
        durationMs: Date.now() - startedAt,
        firstError: firstMessage,
        retryError: retryMessage,
      });
      throw retryError;
    }
  }
}

async function startDaemon(): Promise<void> {
  const cron = await import("node-cron");
  const expression = buildCronExpression(
    env.ingestionScheduleHour,
    env.ingestionScheduleMinute,
  );

  if (!cron.validate(expression)) {
    throw new Error(`Invalid cron expression: ${expression}`);
  }

  logEvent("scheduled_ingestion_daemon_start", {
    cron: expression,
    timezone: env.ingestionScheduleTimezone,
  });

  cron.schedule(
    expression,
    () => {
      runScheduledIngestionOnce().catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        logEvent("scheduled_ingestion_daemon_job_error", { error: message });
      });
    },
    { timezone: env.ingestionScheduleTimezone },
  );

  await new Promise<void>(() => {
    // Keep process alive for the scheduled daemon.
  });
}

async function main(): Promise<void> {
  const args = parseScheduleArgs(process.argv.slice(2));

  if (args.once) {
    await runScheduledIngestionOnce();
    return;
  }

  await startDaemon();
}

const isMainModule =
  process.argv[1] !== undefined &&
  path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1]);

if (isMainModule) {
  main().catch((error: unknown) => {
    console.error("Scheduler failed:", error);
    process.exit(1);
  });
}
