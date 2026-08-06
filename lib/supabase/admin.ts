import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

function getEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error("Missing env var: NEXT_PUBLIC_SUPABASE_URL");
  }

  return { url, serviceRoleKey };
}

export function createAdminClient() {
  if (typeof window !== "undefined") {
    throw new Error("createAdminClient cannot be invoked on the client side (browser).");
  }

  const { url, serviceRoleKey } = getEnv();

  if (!serviceRoleKey) {
    throw new Error("Missing env var: SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: {
      fetch: (fetchUrl, options) => {
        return fetch(fetchUrl, { ...options, cache: "no-store" });
      },
    },
  });
}
