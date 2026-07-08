import { getRedisConnectionOptions, isRedisConfigured } from "@/lib/config/redis";
import { CACHE_TTLS, CACHE_KEYS, COOLDOWN_MS } from "@/lib/config/cache";
import type { Redis } from "ioredis";

let _cacheClient: Redis | null = null;
let _lastConnectAttempt = 0;

async function getCacheClient(): Promise<Redis | null> {
  if (!isRedisConfigured()) return null;
  if (_cacheClient) return _cacheClient;

  const now = Date.now();
  if (now - _lastConnectAttempt < COOLDOWN_MS) return null;
  _lastConnectAttempt = now;

  const IORedis = (await import("ioredis")).default;
  const { maxRetriesPerRequest: _mr, ...opts } = getRedisConnectionOptions();
  _cacheClient = new IORedis({
    ...opts,
    connectTimeout: 3000,
    maxRetriesPerRequest: 1,
    retryStrategy: () => null,
    lazyConnect: true,
  });

  try {
    await _cacheClient.connect();
    return _cacheClient;
  } catch (err) {
    console.error("[BotCache] Redis connection failed, disabling cache:", err);
    _cacheClient = null;
    return null;
  }
}

function applyJitter(baseTtl: number, jitterFactor: number): number {
  const jitter = baseTtl * jitterFactor;
  const offset = Math.floor(Math.random() * jitter * 2 - jitter);
  return baseTtl + offset;
}

async function withCache<T>(
  cacheKey: string,
  baseTtl: number,
  jitterFactor: number,
  fetcher: () => Promise<T | null>
): Promise<T | null> {
  const redis = await getCacheClient();
  if (!redis) return fetcher();

  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as T;
    }
  } catch (err) {
    console.error("[BotCache] Cache read error, falling through:", err);
  }

  const lockKey = `${cacheKey}:lock`;
  let data: T | null = null;

  try {
    const lockAcquired = await redis.set(lockKey, "1", "EX", CACHE_TTLS.STAMPEDE_LOCK, "NX");
    if (lockAcquired) {
      data = await fetcher();
      if (data) {
        const ttl = applyJitter(baseTtl, jitterFactor);
        await redis.setex(cacheKey, ttl, JSON.stringify(data));
      }
      await redis.del(lockKey);
      return data;
    }

    for (let i = 0; i < CACHE_TTLS.STAMPEDE_RETRIES; i++) {
      await new Promise((r) => setTimeout(r, CACHE_TTLS.STAMPEDE_RETRY_MS));
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          return JSON.parse(cached) as T;
        }
      } catch {
        // retry
      }
    }

    data = await fetcher();
    if (data) {
      const ttl = applyJitter(baseTtl, jitterFactor);
      await redis.setex(cacheKey, ttl, JSON.stringify(data)).catch(() => {});
    }
    return data;
  } catch (err) {
    console.error("[BotCache] Cache error, falling back to DB:", err);
  }

  return fetcher();
}

export async function getBotWidgetCache<T>(
  botId: string,
  fetcher: () => Promise<T | null>,
  options: { secure?: boolean } = {}
): Promise<T | null> {
  const cacheKey = options.secure ? CACHE_KEYS.botWidgetSecure(botId) : CACHE_KEYS.botWidget(botId);

  return withCache(cacheKey, CACHE_TTLS.BOT_WIDGET, CACHE_TTLS.BOT_WIDGET_JITTER, fetcher);
}

export async function getBotConfigCache<T>(
  botId: string,
  fetcher: () => Promise<T | null>
): Promise<T | null> {
  return withCache(
    CACHE_KEYS.botConfig(botId),
    CACHE_TTLS.BOT_CONFIG,
    CACHE_TTLS.BOT_CONFIG_JITTER,
    fetcher
  );
}

export async function clearBotWidgetCache(botId: string): Promise<void> {
  const redis = await getCacheClient();
  if (!redis) return;

  try {
    await Promise.all([
      redis.del(CACHE_KEYS.botWidget(botId)),
      redis.del(CACHE_KEYS.botWidgetSecure(botId)),
      redis.del(CACHE_KEYS.botConfig(botId)),
    ]);
  } catch (err) {
    console.error(`[BotCache] Failed to clear cache for bot ${botId}:`, err);
  }
}
