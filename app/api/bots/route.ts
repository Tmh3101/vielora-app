import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/lib/constants";
import { BOTS_PAGE_SIZE } from "@/lib/constants/pagination";
import { authenticateRequest, isAuthError } from "@/lib/helpers/auth-helpers";
import { getBotsPaginated } from "@/lib/services/bot.service";

const VALID_SORT_FIELDS = ["name", "created_at"] as const;
const VALID_SORT_ORDERS = ["asc", "desc"] as const;

export async function OPTIONS() {
  return NextResponse.json(null, { headers: corsHeaders });
}

export async function GET(req: NextRequest) {
  try {
    const authResult = await authenticateRequest(req);
    if (isAuthError(authResult)) return authResult;
    const { user, supabase } = authResult;

    const searchParams = req.nextUrl.searchParams;

    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(Math.max(1, Number(searchParams.get("limit")) || BOTS_PAGE_SIZE), 50);
    const search = searchParams.get("search") || undefined;
    const workspaceId =
      searchParams.get("workspaceId") ||
      req.headers.get("x-workspace-id") ||
      req.cookies.get("active_workspace_id")?.value ||
      undefined;

    const sortByParam = searchParams.get("sortBy");
    const sortBy = VALID_SORT_FIELDS.includes(sortByParam as (typeof VALID_SORT_FIELDS)[number])
      ? (sortByParam as (typeof VALID_SORT_FIELDS)[number])
      : "created_at";

    const sortOrderParam = searchParams.get("sortOrder");
    const sortOrder = VALID_SORT_ORDERS.includes(
      sortOrderParam as (typeof VALID_SORT_ORDERS)[number]
    )
      ? (sortOrderParam as (typeof VALID_SORT_ORDERS)[number])
      : "desc";

    const result = await getBotsPaginated(supabase, user.id, {
      page,
      limit,
      search,
      sortBy,
      sortOrder,
      workspaceId,
    });

    return NextResponse.json(
      { success: true, data: { ...result, page, limit } },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("Error fetching bots:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
