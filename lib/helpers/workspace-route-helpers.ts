import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { corsHeaders } from "@/lib/constants";
import { UUID_REGEX } from "@/lib/utils/uuid";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AdminClient = ReturnType<typeof createAdminClient>;

/**
 * Kết quả của `authenticateRequest`.
 * - `authenticated`: `true` nếu session hợp lệ, `false` nếu không.
 * - `response`: NextResponse 401 khi `authenticated` là `false`.
 * - `user`, `adminClient`: chỉ có giá trị khi `authenticated` là `true`.
 */
export type AuthResult =
  | {
      authenticated: true;
      user: { id: string; email?: string };
      adminClient: AdminClient;
      response?: never;
    }
  | { authenticated: false; response: NextResponse; user?: never; adminClient?: never };

// ---------------------------------------------------------------------------
// authenticateRequest
// ---------------------------------------------------------------------------

/**
 * Xác thực session của request hiện tại qua Supabase Auth.
 *
 * @returns `AuthResult` với `authenticated: true` nếu hợp lệ,
 *          hoặc `authenticated: false` kèm 401 response nếu không.
 *
 * @example
 * const auth = await authenticateRequest();
 * if (!auth.authenticated) return auth.response;
 * const { user, adminClient } = auth;
 */
export async function authenticateRequest(): Promise<AuthResult> {
  const supabase = await createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      authenticated: false,
      response: NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401, headers: corsHeaders }
      ),
    };
  }

  return {
    authenticated: true,
    user: { id: user.id, email: user.email },
    adminClient: createAdminClient(),
  };
}

// ---------------------------------------------------------------------------
// resolveWorkspaceId
// ---------------------------------------------------------------------------

/**
 * Nhận `rawWsId` (UUID hoặc slug) và trả về UUID thực sự của workspace.
 *
 * - Nếu `rawWsId` đã là UUID hợp lệ → trả về nguyên.
 * - Nếu là slug → query bảng `workspaces` để lấy `id`.
 * - Nếu không tìm thấy → vẫn trả về `rawWsId` (để layer trên tự xử lý 404).
 *
 * @param adminClient  Supabase admin client (đã tạo trước qua `createAdminClient()`)
 * @param rawWsId      Workspace ID hoặc slug từ URL params
 * @returns UUID của workspace
 *
 * @example
 * const wsId = await resolveWorkspaceId(adminClient, rawWsId);
 */
export async function resolveWorkspaceId(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adminClient: SupabaseClient<any, any, any>,
  rawWsId: string
): Promise<string> {
  if (UUID_REGEX.test(rawWsId)) {
    return rawWsId;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: wsData } = await (adminClient as any)
    .from("workspaces")
    .select("id")
    .eq("slug", rawWsId)
    .maybeSingle();

  return wsData?.id ?? rawWsId;
}
