import { NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { sendWelcomeEmail } from "@/lib/services/email.service";

/**
 * OAuth PKCE callback handler.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") ?? "/dashboard";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/dashboard";

  if (code) {
    const cookieStore = cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.delete({ name, ...options });
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user?.id && user?.email) {
          const { createAdminClient } = await import("@/lib/supabase/server");
          const { WorkspaceService } = await import("@/lib/services/workspace.service");
          const adminClient = createAdminClient();

          // 1. Ensure user has a default workspace created
          await WorkspaceService.getOrCreateDefaultWorkspace(user.id);

          // 2. Reconcile pre-created group_members records by email
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (adminClient as any)
            .from("group_members")
            .update({ user_id: user.id })
            .eq("email", user.email.toLowerCase())
            .neq("user_id", user.id);

          // 3. Send welcome email for new users (created within last 5 minutes)
          if (user.created_at) {
            const createdAt = new Date(user.created_at).getTime();
            const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
            if (createdAt > fiveMinutesAgo) {
              const fullName =
                (user.user_metadata?.full_name as string) ||
                (user.user_metadata?.name as string) ||
                user.email.split("@")[0];
              await sendWelcomeEmail(user.email, fullName);
            }
          }
        }
      } catch (err) {
        console.error("[AuthCallback] Session init error:", err);
      }

      return NextResponse.redirect(new URL(next, appUrl));
    } else {
      console.error("[AuthCallback] Exchange Error:", error.message);
    }
  }

  return NextResponse.redirect(new URL("/auth?error=oauth_failed", appUrl));
}
