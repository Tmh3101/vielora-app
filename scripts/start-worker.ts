/**
 * Crawler Worker Startup Script
 *
 * Run this script in a separate terminal to start the BullMQ worker:
 * npm run worker
 *
 * The worker will:
 * - Process discover jobs from discover-queue
 * - Process page-crawler jobs from page-crawler-queue
 * - Process indexing jobs from indexer-queue
 * - Keep legacy crawler-queue worker for backward compatibility
 * - Update page/bot status in database
 */

// Load environment variables FIRST (before any other imports)
import { config } from "dotenv";
config({ path: ".env" });

// Now dynamically import the worker module (after env is loaded)
async function main() {
  const { startWorkers, registerShutdownHandlers, isWorkerRunning } =
    await import("../lib/scraper");

  // Register shutdown handlers for graceful shutdown
  registerShutdownHandlers();

  // Start workers
  startWorkers();

  console.log("> Worker started successfully");
  console.log("");
  console.log("> Configuration:");
  console.log(
    "   - Queues: discover-queue, page-crawler-queue, indexer-queue, crawler-queue (legacy)"
  );
  console.log("   - Discover concurrency: 5 jobs");
  console.log("   - Page crawler concurrency: 15 jobs");
  console.log("   - Indexer concurrency: 2 jobs");
  console.log("   - Legacy concurrency: 1 job");
  console.log("");
  console.log("> Waiting for jobs... Press Ctrl+C to stop");

  // Health check interval
  setInterval(() => {
    if (!isWorkerRunning()) {
      console.error("Worker stopped unexpectedly!");
      process.exit(1);
    }
  }, 30000); // Check every 30 seconds
}

// Handle unhandled rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

// Start the worker
main().catch((error) => {
  console.error("Failed to start worker:", error);
  process.exit(1);
});
