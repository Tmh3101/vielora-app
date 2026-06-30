import type { ServiceClient } from "@/lib/services/types";
import type { Tables, Json } from "@/lib/supabase/types";

export type BotLeadRow = Tables<"bot_leads">;

export interface CreateLeadParams {
  botId: string;
  visitorSessionId: string;
  unansweredQuestion: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  note?: string;
  chatHistory?: unknown[];
}

export interface LeadListOptions {
  status?: string;
  limit?: number;
  offset?: number;
}

export async function createLead(
  client: ServiceClient,
  params: CreateLeadParams
): Promise<BotLeadRow> {
  const { data, error } = await client
    .from("bot_leads")
    .insert({
      bot_id: params.botId,
      visitor_session_id: params.visitorSessionId,
      unanswered_question: params.unansweredQuestion,
      customer_name: params.customerName,
      customer_email: params.customerEmail,
      customer_phone: params.customerPhone ?? null,
      note: params.note ?? null,
      chat_history: (params.chatHistory as unknown as Json) ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as unknown as BotLeadRow;
}

export async function getLeadsByBotId(
  client: ServiceClient,
  botId: string,
  options: LeadListOptions = {}
): Promise<{ leads: BotLeadRow[]; total: number }> {
  let query = client.from("bot_leads").select("*", { count: "exact" }).eq("bot_id", botId);

  if (options.status) {
    query = query.eq("status", options.status);
  }

  query = query
    .order("created_at", { ascending: false })
    .limit(options.limit ?? 10)
    .range(options.offset ?? 0, (options.offset ?? 0) + (options.limit ?? 10) - 1);

  const { data, error, count } = await query;

  if (error) throw new Error(error.message);
  return { leads: (data ?? []) as unknown as BotLeadRow[], total: count ?? 0 };
}

export async function getLeadById(
  client: ServiceClient,
  leadId: string
): Promise<BotLeadRow | null> {
  const { data, error } = await client.from("bot_leads").select("*").eq("id", leadId).single();

  if (error) return null;
  return data as unknown as BotLeadRow | null;
}

export async function updateLeadStatus(
  client: ServiceClient,
  leadId: string,
  botId: string,
  status: string
): Promise<void> {
  const { error } = await client
    .from("bot_leads")
    .update({ status })
    .eq("id", leadId)
    .eq("bot_id", botId);

  if (error) throw new Error(error.message);
}
