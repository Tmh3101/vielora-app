import { createAdminClient } from "@/lib/supabase/server";
import { classifyIntent } from "@/lib/rag/intent-classifier";
import { hybridRetrival } from "@/lib/rag/retrieval";
import { generateChatResponse } from "@/lib/rag/generative";
import { MessageRole } from "@/lib/constants";
import { getSystemPrompt } from "@/lib/ai/prompt";
import { deductBotCredits, refundBotCredits } from "@/lib/services/credit.service";
import { getBotWithAIConfigCached, BotAIConfig } from "@/lib/services/server/bot-cache.service";
import {
  insertGroupMessage,
  listGroupMessages,
  GroupMessageRow,
} from "@/lib/services/group-chat.service";
import { GROUP_MAX_HISTORY_MESSAGES } from "@/lib/config/group-chat";
import { ERROR_RESPONSE } from "@/config/rag";
import { ETransactionType, EGroupChatStatus, EGroupSenderType } from "@/types";

export interface GroupReplyContext {
  systemPrompt: string;
  conversationHistory: Array<{ role: "user" | "model"; content: string }>;
}

export async function buildGroupReplyContext(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adminClient: any,
  groupId: string,
  bot: BotAIConfig,
  triggerMessageId: string,
  retrievedContext: string
): Promise<GroupReplyContext> {
  const { messages } = await listGroupMessages(adminClient, groupId, {
    limit: GROUP_MAX_HISTORY_MESSAGES,
  });

  // Filter out deleted messages and the current trigger message from history
  const activeMessages = messages
    .filter((m) => !m.deleted_at && m.id !== triggerMessageId)
    .reverse();

  const conversationHistory = activeMessages.map((m) => ({
    role: m.sender_type === EGroupSenderType.Bot ? MessageRole.MODEL : MessageRole.USER,
    content: m.content,
  }));

  const domain = bot.allowed_domains?.[0] || bot.slug || bot.domain || "vielora.vn";
  const isPaidOwner = bot.owner_plan_code && bot.owner_plan_code !== "free";
  const personalityPrompt = isPaidOwner ? (bot.personality_prompt ?? undefined) : undefined;
  const skillsPrompt = isPaidOwner ? (bot.skills_prompt ?? undefined) : undefined;

  const systemPrompt = getSystemPrompt(
    { name: bot.name, domain },
    retrievedContext,
    personalityPrompt,
    skillsPrompt
  );

  return {
    systemPrompt,
    conversationHistory,
  };
}

export async function runGroupBotReply(
  groupId: string,
  triggerMessage: { id: string; content: string; reply_to_id?: string | null }
): Promise<GroupMessageRow | null> {
  const adminClient = createAdminClient();

  try {
    // 1. Fetch group & bot with full AI config (personality & skills)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: group, error: groupErr } = await (adminClient as any)
      .from("group_chats")
      .select("id, bot_id, status")
      .eq("id", groupId)
      .single();

    if (groupErr || !group || group.status !== EGroupChatStatus.Active) {
      console.warn("[GroupBotReply] Group not found or inactive:", groupId);
      return null;
    }

    const bot = await getBotWithAIConfigCached(adminClient, group.bot_id);

    if (!bot) {
      console.warn("[GroupBotReply] Bot not found:", group.bot_id);
      return null;
    }

    // 2. Classify intent & run RAG if needed
    const intent = classifyIntent(triggerMessage.content);
    let retrievedContext = "";

    if (intent === "knowledge") {
      const retrieval = await hybridRetrival(
        triggerMessage.content,
        bot.id,
        bot.workspace_id ?? null
      );
      retrievedContext = retrieval.context || "";
    }

    // 3. Deduct credit (1 credit per reply)
    const CREDIT_PER_MESSAGE = 1;
    const creditResult = await deductBotCredits(adminClient, bot, {
      creditAmount: CREDIT_PER_MESSAGE,
      transactionType: ETransactionType.ChatMessage,
      transactionDescription: `Group bot reply credit deduction for bot ${bot.id}`,
    });

    if (!creditResult.success) {
      console.warn("[GroupBotReply] Insufficient credits for bot reply:", creditResult.message);
      // If insufficient credits, send system fallback without credit deduction
      return await insertGroupMessage(adminClient, {
        groupId,
        senderType: EGroupSenderType.Bot,
        senderId: null,
        content: "Bot đã hết credits để trả lời. Vui lòng nạp thêm credits cho workspace.",
        replyToId: triggerMessage.id,
        shouldBotReply: false,
      });
    }

    // 4. Build context & generate LLM response
    const { systemPrompt, conversationHistory } = await buildGroupReplyContext(
      adminClient,
      groupId,
      bot,
      triggerMessage.id,
      retrievedContext
    );

    let botAnswer: string;
    try {
      botAnswer = await generateChatResponse(
        systemPrompt,
        triggerMessage.content,
        conversationHistory
      );
    } catch (llmErr) {
      console.error("[GroupBotReply] LLM generation error:", llmErr);
      // Refund credits on LLM generation error
      if (
        (creditResult.deductedFromSubscription ?? 0) > 0 ||
        (creditResult.deductedFromPayg ?? 0) > 0
      ) {
        await refundBotCredits(adminClient, bot, {
          deductedFromSubscription: creditResult.deductedFromSubscription ?? 0,
          deductedFromPayg: creditResult.deductedFromPayg ?? 0,
          transactionType: ETransactionType.ChatMessageRefund,
          transactionDescription: `Refund credit due to LLM error in group chat for bot ${bot.id}`,
        }).catch((err) => console.error("Refund credit error:", err));
      }
      botAnswer = ERROR_RESPONSE;
    }

    // 5. Save bot reply message
    return await insertGroupMessage(adminClient, {
      groupId,
      senderType: EGroupSenderType.Bot,
      senderId: null,
      content: botAnswer,
      replyToId: triggerMessage.id,
      shouldBotReply: false,
    });
  } catch (err) {
    console.error("[GroupBotReply] Unexpected error in bot reply pipeline:", err);
    return null;
  }
}
