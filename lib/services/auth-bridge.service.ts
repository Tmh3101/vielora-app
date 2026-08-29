import { createAdminClient } from "@/lib/supabase/server";

export interface PendingSessionRecord {
  accessToken: string;
  refreshToken?: string | null;
}

/**
 * Stores temporary OAuth session tokens for iOS PWA bridging.
 * TTL is 5 minutes.
 */
export async function storePendingAuthSession(
  sessionId: string,
  accessToken: string,
  refreshToken?: string | null
): Promise<boolean> {
  if (!sessionId || !accessToken) {
    return false;
  }

  try {
    const supabase = createAdminClient();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from("pending_auth_sessions").upsert({
      id: sessionId,
      access_token: accessToken,
      refresh_token: refreshToken ?? null,
      expires_at: expiresAt,
    });

    if (error) {
      console.error("[AuthBridge] Failed to store pending session in DB:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("[AuthBridge] Error storing pending session:", error);
    return false;
  }
}

/**
 * Atomically claims and deletes a pending OAuth session (one-time use).
 * If session is expired or not found, returns null.
 */
export async function claimPendingAuthSession(
  sessionId: string
): Promise<PendingSessionRecord | null> {
  if (!sessionId) {
    return null;
  }

  try {
    const supabase = createAdminClient();

    // 1. Fetch the pending session
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("pending_auth_sessions")
      .select("id, access_token, refresh_token, expires_at")
      .eq("id", sessionId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    // 2. Immediately delete the session (atomic single-claim)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("pending_auth_sessions").delete().eq("id", sessionId);

    // 3. Verify expiration
    if (new Date(data.expires_at) < new Date()) {
      return null;
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
    };
  } catch (error) {
    console.error("[AuthBridge] Error claiming pending session:", error);
    return null;
  }
}
