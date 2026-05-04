/**
 * Web Scraper - Main Entry Point
 *
 * A queue-based web crawler built on BullMQ and Redis.
 * Supports both static (Cheerio) and dynamic (Puppeteer) extraction.
 */

// ============================================================================
// Queue Operations
// ============================================================================

export {
  addDiscoverJob,
  addIndexerJob,
  addIndexerJobs,
  getDiscoverQueue,
  getIndexerQueue,
  getQueueStatus,
  closeQueue,
  RATE_LIMITER_CONFIG,
} from "./core/queue";

// ============================================================================
// Worker Operations (Puppeteer included)
// ============================================================================

export {
  startDiscoverWorker,
  startIndexerWorker,
  stopDiscoverWorker,
  stopIndexerWorker,
  startWorkers,
  stopWorkers,
  stopWorker,
  gracefulShutdown,
  registerShutdownHandlers,
  isWorkerRunning,
} from "./core/worker";

// ============================================================================
// Redis Configuration
// ============================================================================

export { getRedisConnectionOptions, isRedisHealthy, isRedisConfigured } from "@/lib/config/redis";

// ============================================================================
// Utilities
// ============================================================================

export { extractBaseDomain, normalizeUrl } from "./core/link-processor";
export { getRandomUserAgent } from "./utils/user-agents";
