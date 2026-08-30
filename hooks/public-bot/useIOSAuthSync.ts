"use client";

import { useEffect, useRef } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { isIOS, isStandaloneMode } from "@/lib/helpers/pwa-helpers";
import { PENDING_IOS_AUTH_KEY } from "@/lib/constants/auth";

export function useIOSAuthSync(onSuccess?: () => void) {
  const isClaimingRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isIOS() || !isStandaloneMode()) return;

    const claimSession = async () => {
      if (isClaimingRef.current) return;
      let pendingSid: string | null = null;
      try {
        pendingSid = localStorage.getItem(PENDING_IOS_AUTH_KEY);
      } catch {
        return;
      }

      if (!pendingSid) return;

      isClaimingRef.current = true;
      try {
        const response = await fetch("/api/auth/claim-session", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ sessionId: pendingSid }),
        });

        if (!response.ok) {
          isClaimingRef.current = false;
          return;
        }

        const json = await response.json();
        if (json.success && json.data?.access_token) {
          const supabase = createBrowserSupabaseClient();
          await supabase.auth.setSession({
            access_token: json.data.access_token,
            refresh_token: json.data.refresh_token,
          });

          try {
            localStorage.removeItem(PENDING_IOS_AUTH_KEY);
          } catch {
            // ignore
          }

          if (onSuccess) {
            onSuccess();
          }
        }
      } catch (err) {
        console.error("[useIOSAuthSync] Error claiming session:", err);
      } finally {
        isClaimingRef.current = false;
      }
    };

    // Check immediately on mount
    claimSession();

    // Check on visibility change (when user returns from In-App browser)
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        claimSession();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    // Polling interval every 2.5s (up to 3 minutes)
    const interval = setInterval(claimSession, 2500);
    const timeout = setTimeout(
      () => {
        clearInterval(interval);
      },
      3 * 60 * 1000
    );

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [onSuccess]);
}
