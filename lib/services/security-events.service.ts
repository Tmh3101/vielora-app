import type { ServiceClient } from "@/lib/services/types";

export type SecurityActionType = "BLOCKED_SECURITY" | "CANCELLED_BY_USER" | "BLOCKED_CLIENT";

export interface LogSecurityEventInput {
  bot_id: string;
  visitor_id: string;
  conversation_id?: string | null;
  url: string;
  action_type: SecurityActionType;
  reason?: string | null;
  user_agent?: string | null;
  ip_address?: string | null;
}

/**
 * Appends a security/cancellation event to public.security_events.
 * Uses the admin (service-role) client so RLS does not block the insert.
 * Failures are swallowed (logged as console.error) — never throw to the caller,
 * because security logging must NEVER break the main chat response (FR-6 / AC-6).
 */
export async function logSecurityEvent(
  client: ServiceClient,
  input: LogSecurityEventInput
): Promise<void> {
  try {
    const { error } = await client.from("security_events").insert({
      bot_id: input.bot_id,
      visitor_id: input.visitor_id,
      conversation_id: input.conversation_id ?? null,
      url: input.url,
      action_type: input.action_type,
      reason: input.reason ?? null,
      user_agent: input.user_agent ?? null,
      ip_address: input.ip_address ?? null,
    });
    if (error) {
      console.error("[SmartHomepage] Failed to log security event:", error.message);
    }
  } catch (err) {
    console.error("[SmartHomepage] Exception logging security event:", err);
  }
}

export async function logBlockedNavigation(
  client: ServiceClient,
  params: {
    botId: string;
    visitorId: string;
    conversationId?: string | null;
    url: string;
    reason?: string;
  }
): Promise<void> {
  await logSecurityEvent(client, {
    bot_id: params.botId,
    visitor_id: params.visitorId,
    conversation_id: params.conversationId ?? null,
    url: params.url,
    action_type: "BLOCKED_SECURITY",
    reason: params.reason ?? "Domain not in whitelist",
  });
}
