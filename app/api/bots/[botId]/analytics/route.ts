import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/lib/constants";
import { authenticateRequest, isAuthError } from "@/lib/helpers/auth";
import { getBotAnalytics } from "@/lib/services/analytics.service";
import { getBotByIdServer } from "@/lib/services/bot.service";

interface AnalyticsRouteResponse {
  success: boolean;
  message?: string;
  data?: Awaited<ReturnType<typeof getBotAnalytics>>;
}

/**
 * Parse a date string into a Date object, or indicate absence when the input is missing or invalid.
 *
 * @param value - The date string to parse; may be `null` or an empty string.
 * @returns The `Date` represented by `value`, or `null` if `value` is falsy or not a valid date.
 */
function parseDateParam(value: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Responds to CORS preflight requests using the configured CORS headers.
 *
 * @returns A JSON response with a `null` body and the configured CORS headers
 */
export async function OPTIONS() {
  return NextResponse.json(null, { headers: corsHeaders });
}

/**
 * Handle GET requests to return analytics for a specific bot within a requested date range.
 *
 * @param req - The incoming Next.js request containing query parameters `from` and `to`
 * @param params - Promise resolving to route parameters; must provide `botId`
 * @returns A NextResponse whose JSON body has `success: true` and `data` with analytics on success;
 *          on error returns `success: false` and a `message` with an appropriate HTTP status (400, 403, 404, or 500)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ botId: string }> }
): Promise<NextResponse<AnalyticsRouteResponse>> {
  try {
    const { botId } = await params;

    if (!botId) {
      return NextResponse.json(
        { success: false, message: "botId is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    const authResult = await authenticateRequest(req);
    if (isAuthError(authResult)) return authResult;
    const { user, supabase } = authResult;

    const bot = await getBotByIdServer(supabase, botId);
    if (!bot) {
      return NextResponse.json(
        { success: false, message: "Bot not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    if (bot.user_id !== user.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 403, headers: corsHeaders }
      );
    }

    const from = parseDateParam(req.nextUrl.searchParams.get("from"));
    const to = parseDateParam(req.nextUrl.searchParams.get("to"));

    if (!from || !to) {
      return NextResponse.json(
        { success: false, message: "Valid from and to query params are required" },
        { status: 400, headers: corsHeaders }
      );
    }

    if (from.getTime() > to.getTime()) {
      return NextResponse.json(
        { success: false, message: "from must be before to" },
        { status: 400, headers: corsHeaders }
      );
    }

    const data = await getBotAnalytics(supabase, botId, from, to);

    return NextResponse.json({ success: true, data }, { headers: corsHeaders });
  } catch (error) {
    console.error("Error fetching bot analytics:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
