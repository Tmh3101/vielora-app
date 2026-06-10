import { createHash } from "crypto";
import { getRedisConnectionOptions } from "@/lib/config/redis";
import { MAX_FAILED_ATTEMPTS, COOLDOWN_SECONDS_BY_STAGE, HCM_OFFSET_MS } from "@/config/auth";

interface LoginAttemptState {
  failedCount: number;
  lockStage: number;
  lockedUntil: number;
}

export interface LoginCooldownStatus {
  locked: boolean;
  retryAfter: number;
  lockedUntil: string | null;
  attemptsRemaining: number;
}

export interface FailedLoginAttemptResult extends LoginCooldownStatus {
  failedCount: number;
}

let redisClient: import("ioredis").Redis | null = null;

function getEndOfHcmDay(now = new Date()): Date {
  const hcmNow = new Date(now.getTime() + HCM_OFFSET_MS);
  const nextHcmMidnightUtcMs =
    Date.UTC(hcmNow.getUTCFullYear(), hcmNow.getUTCMonth(), hcmNow.getUTCDate() + 1) -
    HCM_OFFSET_MS;

  return new Date(nextHcmMidnightUtcMs);
}

function getTtlSecondsUntilEndOfHcmDay(now = new Date()): number {
  return Math.max(1, Math.ceil((getEndOfHcmDay(now).getTime() - now.getTime()) / 1000));
}

function parseState(raw: string | null): LoginAttemptState {
  if (!raw) return { failedCount: 0, lockStage: 0, lockedUntil: 0 };

  try {
    const parsed = JSON.parse(raw) as Partial<LoginAttemptState>;
    return {
      failedCount: Number.isFinite(parsed.failedCount) ? Math.max(0, parsed.failedCount!) : 0,
      lockStage: Number.isFinite(parsed.lockStage) ? Math.max(0, parsed.lockStage!) : 0,
      lockedUntil: Number.isFinite(parsed.lockedUntil) ? Math.max(0, parsed.lockedUntil!) : 0,
    };
  } catch {
    return { failedCount: 0, lockStage: 0, lockedUntil: 0 };
  }
}

function toCooldownStatus(state: LoginAttemptState, nowMs: number): LoginCooldownStatus {
  const retryAfter = Math.max(0, Math.ceil((state.lockedUntil - nowMs) / 1000));
  const locked = retryAfter > 0;

  return {
    locked,
    retryAfter,
    lockedUntil: locked ? new Date(state.lockedUntil).toISOString() : null,
    attemptsRemaining: locked ? 0 : Math.max(0, MAX_FAILED_ATTEMPTS - state.failedCount),
  };
}

let redisClientPromise: Promise<import("ioredis").Redis> | null = null;

async function getRedisClient(): Promise<import("ioredis").Redis> {
  if (redisClient) return redisClient;
  if (redisClientPromise) return redisClientPromise;

  redisClientPromise = (async () => {
    const IORedis = (await import("ioredis")).default;
    const { maxRetriesPerRequest: _maxRetriesPerRequest, ...options } = getRedisConnectionOptions();
    const client = new IORedis(options);
    redisClient = client;
    return client;
  })();

  return redisClientPromise;
}

export function normalizeLoginEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function getLoginAttemptKey(email: string): string {
  const normalizedEmail = normalizeLoginEmail(email);
  const emailHash = createHash("sha256").update(normalizedEmail).digest("hex");
  return `auth:login-attempts:${emailHash}`;
}

export async function getLoginCooldown(
  email: string,
  now = new Date()
): Promise<LoginCooldownStatus> {
  const redis = await getRedisClient();
  const state = parseState(await redis.get(getLoginAttemptKey(email)));
  return toCooldownStatus(state, now.getTime());
}

export async function recordFailedLoginAttempt(
  email: string,
  now = new Date()
): Promise<FailedLoginAttemptResult> {
  const redis = await getRedisClient();
  const key = getLoginAttemptKey(email);
  const nowMs = now.getTime();
  const ttlSeconds = getTtlSecondsUntilEndOfHcmDay(now);
  const cooldownSeconds = COOLDOWN_SECONDS_BY_STAGE.join(",");

  const script = `
    local key = KEYS[1]
    local nowMs = tonumber(ARGV[1])
    local maxFailed = tonumber(ARGV[2])
    local ttlSeconds = tonumber(ARGV[3])
    local cooldowns = {}
    for value in string.gmatch(ARGV[4], "[^,]+") do
      table.insert(cooldowns, tonumber(value))
    end

    local raw = redis.call("GET", key)
    local state = { failedCount = 0, lockStage = 0, lockedUntil = 0 }
    if raw then
      local ok, decoded = pcall(cjson.decode, raw)
      if ok and decoded then
        state.failedCount = tonumber(decoded.failedCount) or 0
        state.lockStage = tonumber(decoded.lockStage) or 0
        state.lockedUntil = tonumber(decoded.lockedUntil) or 0
      end
    end

    local function getFinalTtl(lockedUntil, nowMs, defaultTtl)
      if lockedUntil > nowMs then
        local remainingCooldown = math.ceil((lockedUntil - nowMs) / 1000)
        if remainingCooldown > defaultTtl then
          return remainingCooldown
        end
      end
      return defaultTtl
    end

    if state.lockedUntil > nowMs then
      redis.call("EXPIRE", key, getFinalTtl(state.lockedUntil, nowMs, ttlSeconds))
      return cjson.encode(state)
    end

    state.lockedUntil = 0
    state.failedCount = state.failedCount + 1

    if state.failedCount >= maxFailed then
      state.failedCount = 0
      state.lockStage = state.lockStage + 1
      local cooldownIndex = state.lockStage
      if cooldownIndex > #cooldowns then
        cooldownIndex = #cooldowns
      end
      state.lockedUntil = nowMs + (cooldowns[cooldownIndex] * 1000)
    end

    redis.call("SET", key, cjson.encode(state), "EX", getFinalTtl(state.lockedUntil, nowMs, ttlSeconds))
    return cjson.encode(state)
  `;

  const rawState = (await redis.eval(
    script,
    1,
    key,
    nowMs.toString(),
    MAX_FAILED_ATTEMPTS.toString(),
    ttlSeconds.toString(),
    cooldownSeconds
  )) as string;

  const state = parseState(rawState);
  return {
    ...toCooldownStatus(state, nowMs),
    failedCount: state.failedCount,
  };
}

export async function clearLoginAttempts(email: string): Promise<void> {
  const redis = await getRedisClient();
  await redis.del(getLoginAttemptKey(email));
}
