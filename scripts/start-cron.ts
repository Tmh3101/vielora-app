import { config } from "dotenv";
config({ path: ".env" });

async function main(): Promise<void> {
  const { initCronJobs, startCronWorker, closeCronSystem } = await import("../lib/cron");

  async function shutdown(signal: string): Promise<void> {
    console.log(`\n[CronStartup] Received ${signal} — shutting down gracefully…`);
    await closeCronSystem();
    console.log("[CronStartup] Shutdown complete");
    process.exit(0);
  }

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));

  process.on("unhandledRejection", (reason, promise) => {
    console.error("[CronStartup] Unhandled rejection at:", promise, "reason:", reason);
  });

  console.log("[CronStartup] Registering cron jobs…");
  await initCronJobs();

  console.log("[CronStartup] Starting cron worker…");
  startCronWorker();

  console.log("");
  console.log("> Cron worker started successfully");
  console.log("");
  console.log("> Configuration:");
  console.log("   - Queue:        cron-queue");
  console.log("   - Concurrency:  1");
  console.log("   - Drain delay:  5 min (Upstash optimised)");
  console.log("   - Jobs:");
  console.log("       daily-subscription-check  →  0 0 * * *  (midnight UTC)");
  console.log("");
  console.log("> Waiting for jobs… Press Ctrl+C to stop");
}

main().catch((err: unknown) => {
  console.error("[CronStartup] Fatal error:", err);
  process.exit(1);
});
