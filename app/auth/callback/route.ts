import { NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { sendWelcomeEmail } from "@/lib/services/email.service";
import { storePendingAuthSession } from "@/lib/services/auth-bridge.service";
import { getSharedCookieOptions } from "@/lib/supabase/cookie-options";
import { getRootDomain } from "@/config";
import { OAUTH_ERROR_FAILED } from "@/lib/constants/auth";

function getSafeCallbackRedirect(rawNext: string | null, origin: string): URL {
  const defaultUrl = new URL("/dashboard", origin);
  if (!rawNext) return defaultUrl;

  if (rawNext.startsWith("/") && !rawNext.startsWith("//") && !rawNext.includes("\\")) {
    return new URL(rawNext, origin);
  }

  try {
    const parsed = new URL(rawNext);
    const rootDomain = getRootDomain().toLowerCase().split(":")[0];
    const host = parsed.hostname.toLowerCase();
    if (
      host === rootDomain ||
      host.endsWith(`.${rootDomain}`) ||
      host === "localhost" ||
      host === "127.0.0.1" ||
      host.endsWith(".localhost") ||
      host.endsWith(".local")
    ) {
      return parsed;
    }
  } catch {
    // Ignore invalid url format
  }

  return defaultUrl;
}

/**
 * OAuth PKCE callback handler.
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const { searchParams } = requestUrl;
  const origin = requestUrl.origin;

  const code = searchParams.get("code");
  const isPopup = searchParams.get("popup") === "1";
  const iosSid = searchParams.get("ios_sid");
  const nextParam = searchParams.get("next");
  const targetRedirectUrl = getSafeCallbackRedirect(nextParam, origin);

  if (code) {
    const cookieStore = cookies();
    const sharedCookieOpts = getSharedCookieOptions();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookieOptions: sharedCookieOpts,
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({
              name,
              value,
              ...options,
              domain: sharedCookieOpts.domain ?? options.domain,
            });
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.delete({
              name,
              ...options,
              domain: sharedCookieOpts.domain ?? options.domain,
            });
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

      if (iosSid) {
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (session?.access_token) {
            await storePendingAuthSession(iosSid, session.access_token, session.refresh_token);
          }
        } catch (err) {
          console.error("[AuthCallback] Error saving iOS pending session:", err);
        }

        return NextResponse.redirect(
          new URL(`/auth/ios-complete?sid=${encodeURIComponent(iosSid)}`, origin)
        );
      }

      if (isPopup) {
        return NextResponse.redirect(new URL("/auth/popup-complete", origin));
      }

      return NextResponse.redirect(targetRedirectUrl);
    } else {
      console.error("[AuthCallback] Exchange Error:", error.message);
    }
  }

  if (iosSid) {
    return NextResponse.redirect(new URL(`/auth/ios-complete?error=${OAUTH_ERROR_FAILED}`, origin));
  }

  if (isPopup) {
    return NextResponse.redirect(
      new URL(`/auth/popup-complete?error=${OAUTH_ERROR_FAILED}`, origin)
    );
  }

  return NextResponse.redirect(new URL(`/auth?error=${OAUTH_ERROR_FAILED}`, origin));
}
