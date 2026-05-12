/**
 * Redis connection configuration
 * Supports both Upstash Redis URL and self-hosted Redis with individual params
 */

export interface RedisConnectionOptions {
  host: string;
  port: number;
  password?: string;
  username?: string;
  tls?: object;
  maxRetriesPerRequest: null;
  enableReadyCheck: boolean;
}

/**
 * Get Redis connection options
 * Priority:
 * 1. UPSTASH_REDIS_URL or REDIS_URL (URL-based config)
 * 2. Individual params: REDIS_IP, REDIS_PORT, REDIS_PASSWORD (self-hosted)
 */
export function getRedisConnectionOptions(): RedisConnectionOptions {
  // Option 1: URL-based configuration (REDIS_URL, Upstash, or Docker Compose)
  const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL;
  if (redisUrl) {
    const url = new URL(redisUrl);
    console.log(`Using Redis URL: ${url.hostname}:${url.port || 6379}`);
    return {
      host: url.hostname,
      port: parseInt(url.port) || 6379,
      password: url.password || undefined,
      username: url.username || undefined,
      tls: url.protocol === "rediss:" ? {} : undefined,
      maxRetriesPerRequest: null, // Required for BullMQ
      enableReadyCheck: false,
    };
  }

  console.log(
    "UPSTASH_REDIS_URL/REDIS_URL not found, falling back to individual Redis parameters (REDIS_IP, REDIS_PORT, REDIS_PASSWORD)."
  );

  // Option 2: Individual parameters (self-hosted Redis / Docker)
  const host = process.env.REDIS_IP || "localhost";
  const port = parseInt(process.env.REDIS_PORT || "6379");
  const password = process.env.REDIS_PASSWORD;

  if (!password) {
    throw new Error(
      "Redis not configured. Set UPSTASH_REDIS_URL/REDIS_URL or REDIS_PASSWORD environment variable."
    );
  }

  return {
    host,
    port,
    password,
    username: undefined,
    tls: undefined,
    maxRetriesPerRequest: null, // Required for BullMQ
    enableReadyCheck: false,
  };
}

/**
 * Check if Redis is configured
 */
export function isRedisConfigured(): boolean {
  const hasUrlConfig = !!(process.env.UPSTASH_REDIS_URL || process.env.REDIS_URL);
  const hasParamConfig = !!process.env.REDIS_PASSWORD;
  return hasUrlConfig || hasParamConfig;
}

// Singleton publisher client for Redis Pub/Sub (worker-side PUBLISH)
let _publisher: import("ioredis").Redis | null = null;

export async function getRedisPublisher(): Promise<import("ioredis").Redis> {
  if (_publisher) return _publisher;
  const IORedis = (await import("ioredis")).default;
  const { maxRetriesPerRequest: _mr, ...opts } = getRedisConnectionOptions();
  _publisher = new IORedis(opts);
  return _publisher;
}

/**
 * Check if Redis connection is healthy (simple ping test)
 */
export async function isRedisHealthy(): Promise<boolean> {
  try {
    // Dynamic import to avoid bundling issues
    const IORedis = (await import("ioredis")).default;
    const options = getRedisConnectionOptions();
    const redis = new IORedis(options);
    const pong = await redis.ping();
    await redis.quit();
    return pong === "PONG";
  } catch {
    return false;
  }
}
