/**
 * Rate Limiter for Widget API
 *
 * Uses Supabase usage_logs table for rate limit tracking.
 * Each chat message is recorded as a single row with visitor_id + client_ip,
 * eliminating the previous duplicate (chat_message + chat_ip) pattern.
 */

import { createAdminClient } from "@/lib/supabase/server";
import { BOT_RATE_LIMIT_ERROR_CODES, type BotRateLimitErrorCode } from "@/lib/bot-rate-limit";
import { EUsageAction } from "@/types";

export interface RateLimitParams {
  botId: string;
  clientIp: string;
  limitPerDay?: number | null;
  limitPerIp?: number | null;
}

export interface RateLimitResult {
  allowed: boolean;
  reason?: string;
  code?: BotRateLimitErrorCode;
  remaining: number | null;
  resetAt: string;
  dailyCount: number;
  ipCount: number;
}

/**
 * Get the start of the current day in UTC
 */
function getTodayStart(): Date {
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);
  return now;
}

/**
 * Get the end of the current day (reset time)
 */
function getTodayEnd(): string {
  const end = new Date();
  end.setUTCHours(23, 59, 59, 999);
  return end.toISOString();
}

/**
 * Check bot-wide daily and per-IP daily rate limits.
 */
export async function checkRateLimit(params: RateLimitParams): Promise<RateLimitResult> {
  const { botId, clientIp, limitPerDay = null, limitPerIp = null } = params;

  const todayStart = getTodayStart().toISOString();
  const resetAt = getTodayEnd();
  const hasDailyLimit = limitPerDay != null;
  const hasIpLimit = limitPerIp != null;

  try {
    if (!hasDailyLimit && !hasIpLimit) {
      return {
        allowed: true,
        remaining: null,
        resetAt,
        dailyCount: 0,
        ipCount: 0,
      };
    }

    const supabase = createAdminClient();

    const dailyCountPromise = hasDailyLimit
      ? supabase
          .from("usage_logs")
          .select("*", { count: "exact", head: true })
          .eq("bot_id", botId)
          .eq("action", EUsageAction.ChatMessage)
          .gte("created_at", todayStart)
      : Promise.resolve({ count: 0 });

    const ipCountPromise = hasIpLimit
      ? supabase
          .from("usage_logs")
          .select("*", { count: "exact", head: true })
          .eq("bot_id", botId)
          .eq("client_ip", clientIp)
          .eq("action", EUsageAction.ChatMessage)
          .gte("created_at", todayStart)
      : Promise.resolve({ count: 0 });

    const [{ count: dailyCountResult }, { count: ipCountResult }] = await Promise.all([
      dailyCountPromise,
      ipCountPromise,
    ]);

    const dailyCount = dailyCountResult || 0;
    const ipCount = ipCountResult || 0;

    if (hasDailyLimit && dailyCount >= limitPerDay) {
      return {
        allowed: false,
        reason: "Chatbot đã đạt giới hạn tin nhắn trong ngày.",
        code: BOT_RATE_LIMIT_ERROR_CODES.DailyExceeded,
        remaining: 0,
        resetAt,
        dailyCount,
        ipCount,
      };
    }

    if (hasIpLimit && ipCount >= limitPerIp) {
      return {
        allowed: false,
        reason: "Bạn đã đạt giới hạn tin nhắn trong ngày.",
        code: BOT_RATE_LIMIT_ERROR_CODES.IpExceeded,
        remaining: 0,
        resetAt,
        dailyCount,
        ipCount,
      };
    }

    const remainingCandidates = [
      hasDailyLimit ? limitPerDay - dailyCount : null,
      hasIpLimit ? limitPerIp - ipCount : null,
    ].filter((value): value is number => value != null);

    return {
      allowed: true,
      remaining: remainingCandidates.length > 0 ? Math.min(...remainingCandidates) : null,
      resetAt,
      dailyCount,
      ipCount,
    };
  } catch (error) {
    console.error("[RateLimiter] Error checking rate limit:", error);
    return {
      allowed: true,
      remaining: hasDailyLimit ? limitPerDay : hasIpLimit ? limitPerIp : null,
      resetAt,
      dailyCount: 0,
      ipCount: 0,
    };
  }
}
