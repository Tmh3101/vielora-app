import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { sendWelcomeEmail } from "@/lib/services/email.service";
import { storePendingAuthSession } from "@/lib/services/auth-bridge.service";
import { getSharedCookieOptions } from "@/lib/supabase/cookie-options";
import { getRootDomain } from "@/config";
import { OAUTH_ERROR_FAILED } from "@/lib/constants/auth";
import { getRequestOrigin, getSafeCallbackRedirect } from "@/lib/auth/callback-helpers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Type for cookies captured from Supabase's setAll callback
type CapturedCookie = {
  name: string;
  value: string;
  options?: Record<string, unknown>;
};

/**
 * OAuth PKCE callback handler.
 * Hotfix: respect X-Forwarded-* behind nginx + use getAll/setAll for chunked PKCE cookies + verbose log
 *
 * IMPORTANT: This handler is a Route Handler (App Router). When we call
 * `cookieStore.set(...)` via the Supabase client, the cookies are written to
 * the *request-scoped* cookie store, but `NextResponse.redirect()` returns a
 * brand-new response object that does NOT inherit those cookies. If we just
 * return `NextResponse.redirect(targetRedirectUrl)`, the session cookie set by
 * `exchangeCodeForSession` is lost, the user lands on /dashboard without a
 * session, and the layout's `supabase.auth.getUser()` returns null — which
 * triggers `redirect("/auth")` and the well-known OAuth loop.
 *
 * To avoid this, every redirect response in this handler is built by
 * `redirectWithCookies(target)`, which copies all current cookies from the
 * request-scoped `cookieStore` onto the response before returning it.
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const { searchParams } = requestUrl;
  const origin = getRequestOrigin(request);

  const code = searchParams.get("code");
  const isPopup = searchParams.get("popup") === "1";
  const iosSid = searchParams.get("ios_sid");
  const nextParam = searchParams.get("next");
  const targetRedirectUrl = getSafeCallbackRedirect(nextParam, origin);

  // Single cookie store per request - dùng chung cho log và exchange để đảm bảo snapshot nhất quán
  const cookieStore = await cookies();
  const sharedCookieOpts = getSharedCookieOptions();
  // Temporary diagnostic log (1-2 releases) - do not log raw code value
  try {
    console.log("[AuthCallback] req", {
      url: request.url.slice(0, 200),
      origin,
      requestUrlOrigin: requestUrl.origin,
      xfHost: request.headers.get("x-forwarded-host"),
      xfProto: request.headers.get("x-forwarded-proto"),
      host: request.headers.get("host"),
      hasCode: !!code,
      hasErrorParam: !!searchParams.get("error"),
      errorParam: searchParams.get("error"),
      errorDescription: searchParams.get("error_description"),
      nextParam,
      isPopup,
      iosSid: !!iosSid,
      cookieCount: cookieStore.getAll().length,
      cookieNames: cookieStore.getAll().map((c) => c.name),
      hasCodeVerifier: !!cookieStore.getAll().find((c) => c.name.endsWith("-code-verifier")),
      cookieDomain: sharedCookieOpts.domain,
      nextPublicAppUrl: process.env.NEXT_PUBLIC_APP_URL,
      rootDomain: getRootDomain(),
      // Source-tracking: helps us tell if a callback request is the real
      // redirect from Google, a browser re-submit, or a stray client fetch.
      referer: request.headers.get("referer"),
      secFetchSite: request.headers.get("sec-fetch-site"),
      secFetchMode: request.headers.get("sec-fetch-mode"),
      secFetchDest: request.headers.get("sec-fetch-dest"),
      userAgent: request.headers.get("user-agent")?.slice(0, 120),
    });
  } catch (logErr) {
    console.error("[AuthCallback] log error", logErr);
  }

  // Build a redirect response that carries Supabase auth cookies set during
  // exchangeCodeForSession. The Supabase `setAll` callback writes cookies
  // into the request-scoped `cookieStore` (which Next.js merges into the
  // *response* automatically when the handler is a Server Component or
  // Route Handler that returns `NextResponse.next()`). However, when we
  // return `NextResponse.redirect()` the response object is a fresh one and
  // the cookies on the request-scoped store are NOT propagated.
  //
  // To preserve them, we capture every (name, value, options) tuple passed
  // to `setAll` during this request and apply them to the redirect response
  // ourselves. This way the session cookies set by `exchangeCodeForSession`
  // are sent to the browser in the redirect response's `Set-Cookie` header.
  const supabaseSetCookies: CapturedCookie[] = [];

  const redirectWithCookies = (target: URL): NextResponse => {
    const response = NextResponse.redirect(target);
    // Prefer Supabase's own setAll capture (preserves exact attributes).
    // Fall back to cookieStore when exchange was skipped (supabaseSetCookies
    // is empty) — we need to propagate the existing session cookie onto
    // the redirect response so the browser keeps the session on navigation.
    const cookiesToPropagate: CapturedCookie[] =
      supabaseSetCookies.length > 0
        ? supabaseSetCookies
        : cookieStore.getAll().map((c) => ({ name: c.name, value: c.value, options: {} }));

    for (const { name, value, options } of cookiesToPropagate) {
      if (!name.startsWith("sb-")) continue;
      const safe: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(options ?? {})) {
        if (k === "priority" || k === "partitioned") continue;
        safe[k] = v;
      }
      response.cookies.set({ name, value, ...safe });
    }
    return response;
  };

  if (code) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookieOptions: sharedCookieOpts,
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                const domain = sharedCookieOpts.domain ?? options.domain;
                cookieStore.set(name, value, {
                  ...options,
                  domain,
                });
                if (domain && domain.startsWith(".")) {
                  try {
                    cookieStore.set(name, "", {
                      ...options,
                      domain: undefined,
                      maxAge: 0,
                      expires: new Date(0),
                    });
                  } catch {
                    // ignore
                  }
                }
              });
            } catch {
              // ignore - happens when called from Server Component
            }
            // Capture all cookies Supabase wants to set so we can re-apply
            // them on our redirect response (which doesn't inherit the
            // request-scoped cookie store).
            supabaseSetCookies.push(...cookiesToSet);
          },
        },
      }
    );

    // ── Guard: skip exchange if a valid session already exists ──
    // Prevents "AuthPKCECodeVerifierMissingError" when the browser already
    // holds a valid session cookie (e.g. from a prior exchange, a page
    // reload, or a client-side fetch that re-triggers the callback URL).
    // Note: we use getUser() (not getSession()) to verify the JWT is
    // actually valid — getSession() only reads the cookie, while
    // getUser() calls Supabase Auth API to confirm the token isn't
    // expired/revoked.
    let hasValidSession = false;
    try {
      const {
        data: { user: existingUser },
      } = await supabase.auth.getUser();
      if (existingUser?.id) {
        hasValidSession = true;
        console.log("[AuthCallback] Existing valid session found, skipping code exchange", {
          userId: existingUser.id,
        });
      }
    } catch {
      // ignore — will proceed with exchange attempt
    }

    let exchangeError: { message?: string; name?: string; status?: number; code?: string } | null =
      null;
    if (!hasValidSession) {
      try {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        exchangeError = error as typeof exchangeError;
      } catch (e) {
        exchangeError = e as typeof exchangeError;
        console.error("[AuthCallback] exchangeCodeForSession threw", e);
      }
    }
    // Proceed if exchange succeeded OR we already had a valid session.
    // The code-verifier cookie may have been consumed by the first exchange;
    // subsequent callback hits (browser re-fetch, stale redirect) should not
    // fail the entire flow when the session is already active.
    if (exchangeError && hasValidSession) {
      console.warn("[AuthCallback] Exchange skipped — valid session exists", {
        exchangeErrorName: (exchangeError as { name?: string })?.name,
        exchangeErrorCode: (exchangeError as { code?: string })?.code,
      });
    }
    const error = exchangeError && !hasValidSession ? exchangeError : null;
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

        return redirectWithCookies(
          new URL(`/auth/ios-complete?sid=${encodeURIComponent(iosSid)}`, origin)
        );
      }

      if (isPopup) {
        return redirectWithCookies(new URL("/auth/popup-complete", origin));
      }

      return redirectWithCookies(targetRedirectUrl);
    } else {
      console.error(
        "[AuthCallback] Exchange Error full",
        JSON.stringify(
          {
            message: error.message,
            name: (error as unknown as { name?: string })?.name,
            status: (error as unknown as { status?: number })?.status,
            code: (error as unknown as { code?: string })?.code,
          },
          null,
          2
        )
      );
    }
  } else if (searchParams.get("error")) {
    console.error("[AuthCallback] Supabase returned error without code", {
      error: searchParams.get("error"),
      error_description: searchParams.get("error_description"),
      error_code: searchParams.get("error_code"),
    });
  }

  if (iosSid) {
    return redirectWithCookies(new URL(`/auth/ios-complete?error=${OAUTH_ERROR_FAILED}`, origin));
  }

  if (isPopup) {
    return redirectWithCookies(new URL(`/auth/popup-complete?error=${OAUTH_ERROR_FAILED}`, origin));
  }

  return redirectWithCookies(new URL(`/auth?error=${OAUTH_ERROR_FAILED}`, origin));
}
