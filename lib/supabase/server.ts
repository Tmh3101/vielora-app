import { cookies } from "next/headers";
import { createServerClient as createServerClientSSR } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { getSharedCookieOptions } from "./cookie-options";

function getEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error("Missing env var: NEXT_PUBLIC_SUPABASE_URL");
  }

  return { url, anonKey, serviceRoleKey };
}

export async function createServerClient() {
  const { url, anonKey } = getEnv();
  const cookieStore = await cookies();

  if (!anonKey) {
    throw new Error("Missing env var: NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  const sharedCookieOpts = getSharedCookieOptions();

  return createServerClientSSR<Database>(url, anonKey, {
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
            // Dọn host-only cũ nếu đang dùng shared domain .vielora.vn
            // để tránh duplicate Cookie header (host-only + domain) gây refresh loop 429
            if (domain && domain.startsWith(".")) {
              try {
                // Xóa bản host-only cũ (nếu có) bằng cách set maxAge 0 không domain
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
          // Ignore cookie writes in contexts where response cookies are immutable.
        }
      },
    },
  });
}

export { createAdminClient } from "./admin";

export function createAuthClient() {
  const { url, anonKey } = getEnv();

  if (!url || !anonKey) {
    throw new Error("Supabase auth environment variables are not configured");
  }

  return createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
