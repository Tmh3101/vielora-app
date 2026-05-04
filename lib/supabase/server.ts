import { cookies } from "next/headers";
import { createServerClient as createServerClientSSR } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

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

  return createServerClientSSR<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Ignore cookie writes in contexts where response cookies are immutable.
        }
      },
    },
  });
}

export function createAdminClient() {
  const { url, serviceRoleKey } = getEnv();

  if (!serviceRoleKey) {
    throw new Error("Missing env var: SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
