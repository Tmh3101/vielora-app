import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/lib/constants";
import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { createAdminClient } from "@/lib/supabase/server";

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
 * Authenticate the request using the Authorization Bearer token.
 *
 * Extracts the JWT from the `Authorization: Bearer <token>` header,
 * creates a user-context Supabase client (anon key + JWT in headers so
 * RLS policies see the correct `auth.uid()`), verifies the token against
 * Supabase Auth, and returns both the user and the ready-to-use client.
 *
 * Returns a 401 NextResponse on failure — callers should short-circuit with
 * `if (isAuthError(result)) return result;`.
 */
export async function authenticateRequest(
  req: NextRequest
): Promise<AuthResult | NextResponse<AuthErrorBody>> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json(
      { success: false as const, message: "Unauthorized" },
      { status: 401, headers: corsHeaders }
    );
  }

  const token = authHeader.replace("Bearer ", "");
  const supabase = createAdminClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return NextResponse.json(
      { success: false as const, message: "Unauthorized" },
      { status: 401, headers: corsHeaders }
    );
  }

  return { user, supabase };
}

/**
 * Type guard to check if the result is an error response.
 */
export function isAuthError(
  result: AuthResult | NextResponse<AuthErrorBody>
): result is NextResponse<AuthErrorBody> {
  return result instanceof NextResponse;
}
