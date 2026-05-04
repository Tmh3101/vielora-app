/**
 * Widget Security Middleware
 *
 * Provides origin verification and rate limiting for widget API routes.
 * Uses the bot's domain field to validate requests.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getBotForWidgetServer } from "@/lib/services/bot.service";
import { checkRateLimit, RateLimitResult } from "./rate-limiter";
import { corsHeaders } from "@/lib/constants";

export interface SecurityContext {
  botId: string;
  visitorId: string;
  clientIp: string;
  bot: {
    id: string;
    domain: string;
    status: string;
    rate_limit_per_day: number;
    rate_limit_per_ip: number;
    user_id: string;
    name: string;
    avatar_url: string | null;
    widget_settings: unknown;
    is_stopped?: boolean;
  };
}

export interface SecurityResult {
  success: boolean;
  error?: string;
  statusCode?: number;
  context?: SecurityContext;
  rateLimitResult?: RateLimitResult;
}

/**
 * Extracts client IP from request headers
 */
function getClientIp(req: NextRequest): string {
  // Try various headers for IP detection
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  // Fallback
  return "unknown";
}

/**
 * Normalizes domain for comparison
 * Handles www prefix and protocol differences
 */
function normalizeDomain(domain: string): string {
  let normalized = domain.toLowerCase().trim();
  normalized = normalized.replace(/^https?:\/\//, "");
  normalized = normalized.replace(/^www\./, "");
  normalized = normalized.replace(/\/$/, "");
  normalized = normalized.replace(/:\d+$/, "");
  return normalized;
}

/**
 * Validates if origin matches the bot's domain
 * Returns true if:
 * - Bot domain is localhost (dev mode)
 * - Origin matches bot domain (with/without www)
 */
function validateOrigin(origin: string | null, botDomain: string): boolean {
  if (!origin) {
    return false;
  }

  // Normalize and compare
  const normalizedOrigin = normalizeDomain(origin);
  if (normalizedOrigin === normalizeDomain(process.env.NEXT_PUBLIC_APP_URL || "")) {
    return true;
  }

  const normalizedBotDomain = normalizeDomain(botDomain);
  if (normalizedOrigin === normalizedBotDomain) {
    return true;
  }

  // Check if origin is a subdomain of bot domain
  if (normalizedOrigin.endsWith(`.${normalizedBotDomain}`)) {
    return true;
  }

  return false;
}

/**
 * Main security verification function
 * Validates origin and optionally checks rate limits
 */
export async function verifyWidgetRequest(
  req: NextRequest,
  options: {
    checkRateLimits?: boolean;
    requireVisitorId?: boolean;
  } = {}
): Promise<SecurityResult> {
  const { checkRateLimits = false, requireVisitorId = false } = options;

  try {
    // Extract headers
    const botId = req.headers.get("x-bot-id");
    const visitorId = req.headers.get("x-visitor-id");
    const origin = req.headers.get("origin");
    const clientIp = getClientIp(req);

    // Validate required headers
    if (!botId) {
      return {
        success: false,
        error: "Missing x-bot-id header",
        statusCode: 400,
      };
    }

    if (requireVisitorId && !visitorId) {
      return {
        success: false,
        error: "Missing x-visitor-id header",
        statusCode: 400,
      };
    }

    // Get bot from database
    const supabase = createAdminClient();
    const bot = await getBotForWidgetServer(supabase, botId);

    if (!bot) {
      return {
        success: false,
        error: "Bot not found",
        statusCode: 404,
      };
    }

    // Verify origin
    if (!validateOrigin(origin, bot.domain)) {
      return {
        success: false,
        error: "Origin not allowed",
        statusCode: 403,
      };
    }

    // Check rate limits if required
    let rateLimitResult: RateLimitResult | undefined;

    // Only check rate limits if both visitorId is provided and bot has limits set (!= NULL)
    if (checkRateLimits && visitorId && bot.rate_limit_per_day && bot.rate_limit_per_ip) {
      rateLimitResult = await checkRateLimit({
        botId: bot.id,
        visitorId,
        clientIp,
        limitPerVisitor: bot.rate_limit_per_day,
        limitPerIp: bot.rate_limit_per_ip,
      });

      if (!rateLimitResult.allowed) {
        return {
          success: false,
          error: rateLimitResult.reason || "Rate limit exceeded",
          statusCode: 429,
          rateLimitResult,
        };
      }
    }

    return {
      success: true,
      context: {
        botId: bot.id,
        visitorId: visitorId || "",
        clientIp,
        bot: {
          id: bot.id,
          domain: bot.domain,
          status: bot.status,
          rate_limit_per_day: bot.rate_limit_per_day,
          rate_limit_per_ip: bot.rate_limit_per_ip,
          user_id: bot.user_id,
          name: bot.name,
          avatar_url: bot.avatar_url,
          widget_settings: bot.widget_settings,
        },
      },
      rateLimitResult,
    };
  } catch (error) {
    return {
      success: false,
      error: "Internal security error: " + (error instanceof Error ? error.message : ""),
      statusCode: 500,
    };
  }
}

/**
 * Creates an error response with CORS headers
 */
export function createSecurityErrorResponse(result: SecurityResult) {
  return NextResponse.json(
    {
      success: false,
      error: result.error,
      ...(result.rateLimitResult && {
        rateLimitInfo: {
          remaining: result.rateLimitResult.remaining,
          resetAt: result.rateLimitResult.resetAt,
        },
      }),
    },
    {
      status: result.statusCode || 500,
      headers: corsHeaders,
    }
  );
}
