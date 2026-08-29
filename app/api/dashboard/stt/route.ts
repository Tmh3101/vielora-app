import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { ESubscriptionPlan, ETransactionType } from "@/types";
import { KNOWLEDGE_STT_CREDIT_COST } from "@/config/knowledge-voice";
import {
  deductBotCredits,
  refundBotCredits,
  deductWorkspaceCredits,
  refundWorkspaceCredits,
} from "@/lib/services/credit.service";
import {
  getBotActivePlanCode,
  getWorkspaceSubscriptionPlan,
} from "@/lib/services/subscription.service";
import { requireWorkspaceMember } from "@/lib/services/workspace-knowledge.service";
import { transcribeAudio, generateTitleFromText } from "@/lib/ai/stt";
import { authenticateRequest, isAuthError } from "@/lib/helpers/auth-helpers";

import type { Tables } from "@/lib/supabase/types";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const authResult = await authenticateRequest(req);
    if (isAuthError(authResult)) return authResult;
    const { user } = authResult;

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const scope = (formData.get("scope") as string) || "bot";
    const targetId = (formData.get("id") as string) || "";

    if (!file) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy file âm thanh" },
        { status: 400 }
      );
    }

    if (!targetId) {
      return NextResponse.json(
        { success: false, message: "Thiếu ID đối tượng (botId hoặc workspaceId)" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const allowedPlans = [
      ESubscriptionPlan.Standard,
      ESubscriptionPlan.Pro,
      ESubscriptionPlan.Enterprise,
    ];

    let userPlanCode: ESubscriptionPlan | null = null;
    let botData: Tables<"bots"> | null = null;
    let workspaceId: string = "";

    if (scope === "workspace") {
      workspaceId = targetId;
      await requireWorkspaceMember(workspaceId, user.id);
      const wsSub = await getWorkspaceSubscriptionPlan(admin, workspaceId);
      userPlanCode = wsSub?.planCode ?? ESubscriptionPlan.Free;
    } else {
      // scope === "bot"
      const { data: bot, error: botError } = await admin
        .from("bots")
        .select("*")
        .eq("id", targetId)
        .maybeSingle();

      if (botError || !bot) {
        return NextResponse.json(
          { success: false, message: "Không tìm thấy bot" },
          { status: 404 }
        );
      }

      botData = bot;
      workspaceId = bot.workspace_id;
      if (workspaceId) {
        let isAuthorized = false;
        try {
          await requireWorkspaceMember(workspaceId, user.id);
          isAuthorized = true;
        } catch {
          // If not direct workspace member, verify if user is an authorized group member for this bot
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: groupChats } = await (admin as any)
            .from("group_chats")
            .select("id")
            .eq("bot_id", bot.id)
            .eq("status", "active");

          const groupIds = ((groupChats as { id: string }[] | null) || []).map((g) => g.id);

          if (groupIds.length > 0) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let memberQuery = (admin as any)
              .from("group_members")
              .select("id, can_create_note, can_pin_knowledge")
              .in("group_id", groupIds);

            if (user.email) {
              const normalizedEmail = user.email.trim().toLowerCase();
              memberQuery = memberQuery.or(`user_id.eq.${user.id},email.ilike.${normalizedEmail}`);
            } else {
              memberQuery = memberQuery.eq("user_id", user.id);
            }

            const { data: memberRows } = await memberQuery;
            const rows =
              (memberRows as { can_create_note?: boolean; can_pin_knowledge?: boolean }[] | null) ||
              [];
            isAuthorized = rows.some((m) => Boolean(m.can_create_note || m.can_pin_knowledge));
          }
        }

        if (!isAuthorized) {
          return NextResponse.json(
            { success: false, message: "Bạn không có quyền sử dụng tính năng này." },
            { status: 403 }
          );
        }
      }

      userPlanCode = await getBotActivePlanCode(admin, bot);
    }

    // Plan check
    const isAllowedPlan = userPlanCode && allowedPlans.includes(userPlanCode as ESubscriptionPlan);
    if (!isAllowedPlan) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Tính năng Nhập kiến thức bằng giọng nói chỉ hỗ trợ từ gói Standard trở lên. Vui lòng nâng cấp gói cước.",
        },
        { status: 403 }
      );
    }

    // Deduct credit
    let deductionResult: {
      success: boolean;
      message?: string;
      deductedFromSubscription?: number;
      deductedFromPayg?: number;
    } = { success: false };

    if (scope === "workspace") {
      deductionResult = await deductWorkspaceCredits(admin, {
        workspaceId,
        creditAmount: KNOWLEDGE_STT_CREDIT_COST,
        transactionType: ETransactionType.AddKnowledge,
        transactionDescription: `Deducted ${KNOWLEDGE_STT_CREDIT_COST} credit for Voice STT in workspace ${workspaceId}`,
      });
    } else {
      deductionResult = await deductBotCredits(admin, botData!, {
        creditAmount: KNOWLEDGE_STT_CREDIT_COST,
        transactionType: ETransactionType.AddKnowledge,
        transactionDescription: `Deducted ${KNOWLEDGE_STT_CREDIT_COST} credit for Voice STT in bot ${botData!.id}`,
      });
    }

    if (!deductionResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: deductionResult.message || "Không đủ credits để xử lý giọng nói.",
        },
        { status: 402 }
      );
    }

    const deductedFromSubscription = deductionResult.deductedFromSubscription || 0;
    const deductedFromPayg = deductionResult.deductedFromPayg || 0;

    const refundCredit = async () => {
      if (deductedFromSubscription > 0 || deductedFromPayg > 0) {
        if (scope === "workspace") {
          await refundWorkspaceCredits(admin, {
            workspaceId,
            deductedFromSubscription,
            deductedFromPayg,
            transactionType: ETransactionType.AddKnowledgeRefund,
            transactionDescription: `Refunded ${KNOWLEDGE_STT_CREDIT_COST} credit due to Voice STT failure in workspace ${workspaceId}`,
          }).catch((err) => console.error("Refund workspace credits error:", err));
        } else {
          await refundBotCredits(admin, botData!, {
            deductedFromSubscription,
            deductedFromPayg,
            transactionType: ETransactionType.AddKnowledgeRefund,
            transactionDescription: `Refunded ${KNOWLEDGE_STT_CREDIT_COST} credit due to Voice STT failure in bot ${botData!.id}`,
          }).catch((err) => console.error("Refund bot credits error:", err));
        }
      }
    };

    try {
      const arrayBuffer = await file.arrayBuffer();
      const base64Audio = Buffer.from(arrayBuffer).toString("base64");
      const cleanMimeType = file.type || "audio/webm";

      const textResult = await transcribeAudio({
        base64Audio,
        mimeType: cleanMimeType,
      });

      if (!textResult) {
        await refundCredit();
        return NextResponse.json(
          {
            success: false,
            message: "Không nhận diện được giọng nói trong đoạn âm thanh. Vui lòng thử lại.",
          },
          { status: 400 }
        );
      }

      const suggestedTitle = await generateTitleFromText(textResult);

      return NextResponse.json({
        success: true,
        text: textResult,
        title: suggestedTitle,
      });
    } catch (genError) {
      console.error("Error during transcription process:", genError);
      await refundCredit();
      throw genError;
    }
  } catch (error) {
    console.error("Unhandled Dashboard STT Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Lỗi xử lý giọng nói";
    return NextResponse.json({ success: false, message: errorMessage }, { status: 500 });
  }
}
