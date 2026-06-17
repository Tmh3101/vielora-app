"use client";

/**
 * Migration Note: useAuth hook migrated for Next.js
 * - Changed from react-router-dom's useNavigate to Next.js's useRouter
 * - Uses the new supabase client path
 * - Must be used in Client Components only
 */

import { useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/useAuthStore";

export const useAuth = () => {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const user = useAuthStore((s) => s.user);
  const session = useAuthStore((s) => s.session);
  const isLoading = useAuthStore((s) => s.isLoading);
  const setSession = useAuthStore((s) => s.setSession);
  const setLoading = useAuthStore((s) => s.setLoading);
  const storeSignOut = useAuthStore((s) => s.signOut);
  const router = useRouter();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase, setSession, setLoading]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    storeSignOut();
    router.push("/");
  }, [supabase, storeSignOut, router]);

  const requireAuth = useCallback(
    (callback: () => void) => {
      if (!user) {
        router.push("/auth");
        return;
      }
      callback();
    },
    [user, router]
  );

  return {
    user,
    session,
    isLoading,
    signOut,
    requireAuth,
    isAuthenticated: !!user,
  };
};
