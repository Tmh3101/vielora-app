import { NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { extractStatic } from "@/lib/scraper/extractors/static";
import { normalizeKnowledgeUrl } from "@/lib/helpers";
import type { CrawlJob } from "@/types/scrape";
import {
  insertWorkspaceKnowledge,
  isWorkspaceKnowledgeLimitError,
  requireWorkspaceMember,
} from "@/lib/services/workspace-knowledge.service";
import { deductWorkspaceCredits, refundWorkspaceCredits } from "@/lib/services/credit.service";
import { CREDIT_PER_PAGE } from "@/config/credit";
import { EPageSourceType, ETransactionType } from "@/types/enums";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await requireWorkspaceMember(id, user.id);

    const admin = createAdminClient();
    const { data, error: dbError } = await admin
      .from("workspace_knowledge")
      .select("*")
      .eq("workspace_id", id)
      .order("created_at", { ascending: false });

    if (dbError) throw dbError;
    return NextResponse.json({ knowledge: data || [] });
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === "Unauthorized workspace access") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json(
      { error: error.message || "Failed to fetch shared knowledge" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await requireWorkspaceMember(id, user.id);

    const body = await request.json();
    const mode = body.mode ?? "manual";

    if (mode === "url") {
      const normalizedUrl = normalizeKnowledgeUrl(body.url || "");
      if (!normalizedUrl) {
        return NextResponse.json({ error: "URL phải là http hoặc https hợp lệ." }, { status: 400 });
      }

      const admin = createAdminClient();
      const { data: existing } = await admin
        .from("workspace_knowledge")
        .select("id")
        .eq("workspace_id", id)
        .eq("metadata->>url", normalizedUrl)
        .maybeSingle();

      if (existing) {
        return NextResponse.json({ error: "URL này đã tồn tại trong workspace." }, { status: 409 });
      }

      // Deduct credits before crawling the URL
      const deductionResult = await deductWorkspaceCredits(admin, {
        workspaceId: id,
        creditAmount: CREDIT_PER_PAGE,
        transactionType: ETransactionType.AddKnowledge,
        transactionDescription: `Deducted ${CREDIT_PER_PAGE} credits to add URL knowledge for workspace ${id}`,
      });

      if (!deductionResult.success) {
        return NextResponse.json(
          { error: deductionResult.message || "Insufficient credits to add workspace knowledge." },
          { status: 400 }
        );
      }

      const crawlJob: CrawlJob = {
        id: crypto.randomUUID(),
        url: normalizedUrl,
        type: "scrape",
        depth: 0,
        createdAt: Date.now(),
      };

      try {
        const result = await extractStatic(crawlJob);
        if (!result.success) {
          return NextResponse.json(
            { error: `Không thể lấy nội dung từ URL: ${result.error || "Lỗi không xác định"}` },
            { status: 502 }
          );
        }

        const knowledge = await insertWorkspaceKnowledge(createAdminClient(), {
          workspace_id: id,
          title: result.title || normalizedUrl,
          content: result.markdown || "",
          source_type: EPageSourceType.SingleUrl,
          metadata: { url: normalizedUrl },
          created_by: user.id,
        });

        return NextResponse.json({ knowledge }, { status: 201 });
      } catch (err) {
        await refundWorkspaceCredits(createAdminClient(), {
          workspaceId: id,
          deductedFromSubscription: deductionResult.deductedFromSubscription || 0,
          deductedFromPayg: deductionResult.deductedFromPayg || 0,
          transactionType: ETransactionType.AddKnowledgeRefund,
          transactionDescription: `Refunded ${CREDIT_PER_PAGE} credits due to an error while processing URL for workspace ${id}`,
        }).catch(() => undefined);
        throw err;
      }
    }

    if (!body.title || !body.content) {
      return NextResponse.json({ error: "title and content are required" }, { status: 400 });
    }

    // Deduct credits before inserting manual knowledge
    const admin = createAdminClient();
    const deductionResult = await deductWorkspaceCredits(admin, {
      workspaceId: id,
      creditAmount: CREDIT_PER_PAGE,
      transactionType: ETransactionType.AddKnowledge,
      transactionDescription: `Deducted ${CREDIT_PER_PAGE} credits to add manual knowledge for workspace ${id}`,
    });

    if (!deductionResult.success) {
      return NextResponse.json(
        { error: deductionResult.message || "Insufficient credits to add workspace knowledge." },
        { status: 400 }
      );
    }

    try {
      const knowledge = await insertWorkspaceKnowledge(createAdminClient(), {
        workspace_id: id,
        title: body.title,
        content: body.content,
        source_type: body.source_type || "manual",
        created_by: user.id,
      });

      return NextResponse.json({ knowledge }, { status: 201 });
    } catch (err) {
      await refundWorkspaceCredits(createAdminClient(), {
        workspaceId: id,
        deductedFromSubscription: deductionResult.deductedFromSubscription || 0,
        deductedFromPayg: deductionResult.deductedFromPayg || 0,
        transactionType: ETransactionType.AddKnowledgeRefund,
        transactionDescription: `Refunded ${CREDIT_PER_PAGE} credits due to an error while adding manual knowledge for workspace ${id}`,
      }).catch(() => undefined);
      throw err;
    }
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === "Unauthorized workspace access") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (isWorkspaceKnowledgeLimitError(error)) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: error.message || "Failed to create shared knowledge" },
      { status: 500 }
    );
  }
}
