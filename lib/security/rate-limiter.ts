/**
 * Rate Limiter for Widget API
 *
 * Uses Supabase usage_logs table for rate limit tracking.
 * Each chat message is recorded as a single row with visitor_id + client_ip,
 * eliminating the previous duplicate (chat_message + chat_ip) pattern.
 */

import { createAdminClient } from "@/lib/supabase/server";
import { EUsageAction } from "@/types";

export interface RateLimitParams {
  botId: string;
  visitorId: string;
  clientIp: string;
  limitPerVisitor: number;
  limitPerIp: number;
}

export interface RateLimitResult {
  allowed: boolean;
  reason?: string;
  remaining: number;
  resetAt: string;
  visitorCount: number;
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
 * Check rate limits for a visitor/IP combination.
 * Queries usage_logs directly using visitor_id and client_ip columns —
 * no joins through conversations/messages needed.
 */
export async function checkRateLimit(params: RateLimitParams): Promise<RateLimitResult> {
  const { botId, visitorId, clientIp, limitPerVisitor, limitPerIp } = params;

  const todayStart = getTodayStart().toISOString();
  const resetAt = getTodayEnd();

  try {
    const supabase = createAdminClient();

    // Count messages from this visitor today (via usage_logs.visitor_id)
    const { count: visitorCountResult } = await supabase
      .from("usage_logs")
      .select("*", { count: "exact", head: true })
      .eq("bot_id", botId)
      .eq("visitor_id", visitorId)
      .eq("action", EUsageAction.ChatMessage)
      .gte("created_at", todayStart);

    const visitorCount = visitorCountResult || 0;

    // Count messages from this IP today (DDoS protection via usage_logs.client_ip)
    const { count: ipCountResult } = await supabase
      .from("usage_logs")
      .select("*", { count: "exact", head: true })
      .eq("bot_id", botId)
      .eq("client_ip", clientIp)
      .eq("action", EUsageAction.ChatMessage)
      .gte("created_at", todayStart);

    const ipCount = ipCountResult || 0;

    // Check visitor limit
    if (visitorCount >= limitPerVisitor) {
      return {
        allowed: false,
        reason: "Bạn đã hết lượt chat miễn phí trong ngày. Vui lòng quay lại vào ngày mai.",
        remaining: 0,
        resetAt,
        visitorCount,
        ipCount,
      };
    }

    // Check IP limit (DDoS protection)
    if (ipCount >= limitPerIp) {
      return {
        allowed: false,
        reason: "Quá nhiều yêu cầu từ địa chỉ IP này. Vui lòng thử lại sau.",
        remaining: 0,
        resetAt,
        visitorCount,
        ipCount,
      };
    }

    return {
      allowed: true,
      remaining: Math.min(limitPerVisitor - visitorCount, limitPerIp - ipCount),
      resetAt,
      visitorCount,
      ipCount,
    };
  } catch (error) {
    console.error("[RateLimiter] Error checking rate limit:", error);
    // On error, allow the request but log the issue
    return {
      allowed: true,
      remaining: limitPerVisitor,
      resetAt,
      visitorCount: 0,
      ipCount: 0,
    };
  }
}
