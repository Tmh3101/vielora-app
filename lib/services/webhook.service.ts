import { createAdminClient } from "@/lib/supabase/admin";
import crypto from "node:crypto";

export interface RegisterWebhookInput {
  workspaceId: string;
  url: string;
  events: string[];
}

export interface WebhookRecord {
  id: string;
  workspace_id: string;
  url: string;
  secret: string;
  events: string[];
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export class WebhookService {
  /**
   * List webhooks for a workspace.
   */
  static async listWebhooks(workspaceId: string) {
    const supabase = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("workspace_webhooks")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  }

  /**
   * Register a new webhook (Max 10 active webhooks per workspace).
   */
  static async registerWebhook(input: RegisterWebhookInput) {
    const supabase = createAdminClient();

    // Check current count of active webhooks
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count } = await (supabase as any)
      .from("workspace_webhooks")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", input.workspaceId)
      .eq("is_active", true);

    if ((count ?? 0) >= 10) {
      throw new Error("Maximum limit of 10 active webhooks reached per workspace");
    }

    const secret = "whsec_" + crypto.randomBytes(24).toString("hex");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("workspace_webhooks")
      .insert({
        workspace_id: input.workspaceId,
        url: input.url,
        secret,
        events: input.events,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Delete a webhook.
   */
  static async deleteWebhook(webhookId: string, workspaceId: string) {
    const supabase = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("workspace_webhooks")
      .delete()
      .eq("id", webhookId)
      .eq("workspace_id", workspaceId);

    if (error) throw error;
    return { success: true };
  }

  /**
   * Dispatch a webhook event with HMAC-SHA256 signature.
   */
  static async dispatchEvent(
    workspaceId: string,
    eventType: string,
    payload: Record<string, unknown>
  ) {
    const supabase = createAdminClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: webhooks } = await (supabase as any)
      .from("workspace_webhooks")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("is_active", true);

    if (!webhooks || webhooks.length === 0) return;

    const matchingWebhooks = (webhooks as WebhookRecord[]).filter(
      (wh: WebhookRecord) => wh.events.includes(eventType) || wh.events.includes("*")
    );

    const bodyString = JSON.stringify({
      event: eventType,
      workspace_id: workspaceId,
      timestamp: new Date().toISOString(),
      data: payload,
    });

    for (const wh of matchingWebhooks) {
      const signature = crypto.createHmac("sha256", wh.secret).update(bodyString).digest("hex");

      try {
        await fetch(wh.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Vielora-Signature": signature,
            "X-Vielora-Event": eventType,
          },
          body: bodyString,
        });
      } catch {
        // Silently capture dispatch failure (retry handling can be appended)
      }
    }
  }
}
