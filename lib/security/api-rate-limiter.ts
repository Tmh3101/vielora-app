/**
 * API Rate Limiter - Protection against DDoS and Spam Requests
 *
 * Uses in-memory sliding window counter for high performance.
 * For distributed deployments, consider using Redis (Upstash).
 */

import { NextRequest } from "next/server";
import { API_RATE_LIMITS, CLEANUP_INTERVAL, ApiRateLimitConfig } from "@/lib/constants";

// In-memory store for rate limiting
// Key: IP address, Value: array of request timestamps
const requestStore = new Map<string, number[]>();

let cleanupTimer: NodeJS.Timeout | null = null;

/**
 * Start cleanup timer (called automatically)
 */
function startCleanupTimer() {
  if (cleanupTimer) return;

  cleanupTimer = setInterval(() => {
    const now = Date.now();
    const maxWindow = Math.max(
      API_RATE_LIMITS.widgetInit.windowMs,
      API_RATE_LIMITS.widgetChat.windowMs,
      API_RATE_LIMITS.strict.windowMs
    );

    const entries = Array.from(requestStore.entries());
    for (const [key, timestamps] of entries) {
      const validTimestamps = timestamps.filter((t) => now - t < maxWindow);
      if (validTimestamps.length === 0) {
        requestStore.delete(key);
      } else {
        requestStore.set(key, validTimestamps);
      }
    }
  }, CLEANUP_INTERVAL);
}

// Start cleanup on module load
startCleanupTimer();

/**
 * Extract client IP from request
 */
export function getClientIpFromRequest(req: NextRequest): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  const cfConnectingIp = req.headers.get("cf-connecting-ip");
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  return "unknown";
}

/**
 * Check if request is allowed based on rate limit
 */
export function checkApiRateLimit(
  ip: string,
  config: ApiRateLimitConfig
): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const windowStart = now - config.windowMs;

  let timestamps = requestStore.get(ip) || []; // Get existing timestamps for this IP
  timestamps = timestamps.filter((t) => t > windowStart);

  if (timestamps.length >= config.maxRequests) {
    // Calculate when the oldest request will expire
    const oldestInWindow = Math.min(...timestamps);
    const resetIn = Math.ceil((oldestInWindow + config.windowMs - now) / 1000);

    return {
      allowed: false,
      remaining: 0,
      resetIn: Math.max(resetIn, 1),
    };
  }

  // Add current timestamp
  timestamps.push(now);
  requestStore.set(ip, timestamps);

  return {
    allowed: true,
    remaining: config.maxRequests - timestamps.length,
    resetIn: Math.ceil(config.windowMs / 1000),
  };
}

/**
 * Create rate limit response headers
 */
export function createRateLimitHeaders(
  remaining: number,
  resetIn: number,
  limit: number
): Record<string, string> {
  return {
    "X-RateLimit-Limit": limit.toString(),
    "X-RateLimit-Remaining": Math.max(0, remaining).toString(),
    "X-RateLimit-Reset": resetIn.toString(),
  };
}

/**
 * Middleware function to check API rate limit
 * Returns null if allowed, or a Response if rate limited
 */
export function apiRateLimitMiddleware(
  req: NextRequest,
  config: ApiRateLimitConfig
): { rateLimitHeaders: Record<string, string>; retryAfter: number } | null {
  const ip = getClientIpFromRequest(req);
  const result = checkApiRateLimit(ip, config);

  if (!result.allowed) {
    const rateLimitHeaders = createRateLimitHeaders(
      result.remaining,
      result.resetIn,
      config.maxRequests
    );

    return {
      rateLimitHeaders: rateLimitHeaders,
      retryAfter: result.resetIn,
    };
  }

  return null;
}

/**
 * Get rate limit info without incrementing counter
 * Useful for checking status before processing
 */
export function getRateLimitInfo(
  ip: string,
  config: ApiRateLimitConfig
): { remaining: number; resetIn: number } {
  const now = Date.now();
  const windowStart = now - config.windowMs;

  const timestamps = (requestStore.get(ip) || []).filter((t) => t > windowStart);

  return {
    remaining: Math.max(0, config.maxRequests - timestamps.length),
    resetIn: Math.ceil(config.windowMs / 1000),
  };
}

/**
 * Manually record a request (useful when rate limit check happens elsewhere)
 */
export function recordApiRequest(ip: string, config: ApiRateLimitConfig): void {
  const now = Date.now();
  const windowStart = now - config.windowMs;

  let timestamps = requestStore.get(ip) || [];
  timestamps = timestamps.filter((t) => t > windowStart);
  timestamps.push(now);

  requestStore.set(ip, timestamps);
}

/**
 * Clear rate limit data for an IP (useful for testing or admin override)
 */
export function clearRateLimitForIp(ip: string): void {
  requestStore.delete(ip);
}

/**
 * Get current store stats (for monitoring)
 */
export function getRateLimitStats(): { totalIps: number; totalRequests: number } {
  let totalRequests = 0;
  const values = Array.from(requestStore.values());
  for (const timestamps of values) {
    totalRequests += timestamps.length;
  }

  return {
    totalIps: requestStore.size,
    totalRequests,
  };
}
