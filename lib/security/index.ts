/**
 * Security module exports
 */

export { verifyWidgetRequest, type SecurityContext, type SecurityResult } from "./widget-security";

export { checkRateLimit, type RateLimitParams, type RateLimitResult } from "./rate-limiter";

export {
  apiRateLimitMiddleware,
  checkApiRateLimit,
  getClientIpFromRequest,
  createRateLimitHeaders,
  recordApiRequest,
  clearRateLimitForIp,
  getRateLimitStats,
  getRateLimitInfo,
} from "./api-rate-limiter";
