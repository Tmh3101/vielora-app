import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";
import { getSharedCookieOptions } from "./cookie-options";
import type { SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient<Database> | null = null;

export function createBrowserSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file."
    );
  }

  // Singleton cho browser để tránh nhiều GoTrueClient cùng refresh token gây 429
  // Trên server (SSR) mỗi request phải có client riêng, nên chỉ cache khi window tồn tại
  if (typeof window !== "undefined") {
    if (browserClient) return browserClient;
    const opts = getSharedCookieOptions();
    browserClient = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey, {
      cookieOptions: opts,
    }) as unknown as SupabaseClient<Database>;
    // Dọn host-only cũ khi đang dùng Domain=.vielora.vn để tránh duplicate Cookie header
    // (host-only + domain) gây Supabase đọc session hỏng và loop refresh 429
    try {
      if (opts.domain && opts.domain.startsWith(".")) {
        const raw = document.cookie || "";
        const names = raw
          .split(";")
          .map((c) => c.trim().split("=")[0])
          .filter((n) => n.startsWith("sb-") && n.includes("auth-token"));
        const seen = new Set<string>();
        for (const n of names) {
          if (seen.has(n)) continue;
          seen.add(n);
          // Xóa bản host-only cũ (không Domain) nếu tồn tại
          document.cookie = `${n}=; Max-Age=0; Path=/; SameSite=Lax`;
          // Trường hợp chunk .0/.1 cũng cần xóa host-only
          document.cookie = `${n}.0=; Max-Age=0; Path=/; SameSite=Lax`;
          document.cookie = `${n}.1=; Max-Age=0; Path=/; SameSite=Lax`;
        }
      }
    } catch {
      // ignore - document.cookie có thể bị chặn
    }
    return browserClient;
  }

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookieOptions: getSharedCookieOptions(),
  }) as unknown as SupabaseClient<Database>;
}

// Helper để reset singleton trong test hoặc khi signOut cần clear
export function resetBrowserSupabaseClient() {
  browserClient = null;
}
