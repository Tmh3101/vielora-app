"use client";

/**
 * Migration Note: useAuth hook migrated for Next.js
 * - Changed from react-router-dom's useNavigate to Next.js's useRouter
 * - Uses the new supabase client path
 * - Must be used in Client Components only
 */

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { User, Session } from "@supabase/supabase-js";

export const useAuth = () => {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Set up auth state listener FIRST
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const requireAuth = (callback: () => void) => {
    if (!user) {
      router.push("/auth");
      return;
    }
    callback();
  };

  return {
    user,
    session,
    isLoading,
    signOut,
    requireAuth,
    isAuthenticated: !!user,
  };
};
