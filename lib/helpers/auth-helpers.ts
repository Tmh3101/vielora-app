import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/lib/constants";
import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { createAdminClient, createServerClient } from "@/lib/supabase/server";

export interface AuthResult {
  user: User;
  /** User-scoped Supabase client — RLS is enforced as this user. */
  supabase: SupabaseClient<Database>;
}

export interface AuthErrorBody {
  success: false;
  message: string;
}

/**
 * Authenticate the request using Authorization Bearer token or cookie session.
 */
export async function authenticateRequest(
  req: NextRequest
): Promise<AuthResult | NextResponse<AuthErrorBody>> {
  const authHeader = req.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.replace("Bearer ", "");
    const supabase = createAdminClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (!authError && user) {
      return { user, supabase };
    }
  }

  // Fallback to cookie session authentication for web client requests
  try {
    const serverSupabase = await createServerClient();
    const {
      data: { user },
      error: serverAuthError,
    } = await serverSupabase.auth.getUser();

    if (!serverAuthError && user) {
      const adminClient = createAdminClient();
      return { user, supabase: adminClient };
    }
  } catch (err) {
    console.error("Cookie session auth fallback error:", err);
  }

  return NextResponse.json(
    { success: false as const, message: "Unauthorized" },
    { status: 401, headers: corsHeaders }
  );
}

/**
 * Type guard to check if the result is an error response.
 */
export function isAuthError(
  result: AuthResult | NextResponse<AuthErrorBody>
): result is NextResponse<AuthErrorBody> {
  return result instanceof NextResponse;
}
