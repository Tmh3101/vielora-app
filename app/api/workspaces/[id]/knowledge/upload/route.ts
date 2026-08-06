import { NextRequest, NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { uploadKnowledgeFile, deleteKnowledgeFile } from "@/lib/supabase/upload";
import { extractFileContent } from "@/lib/scraper/extractors/files";
import {
  insertWorkspaceKnowledge,
  isWorkspaceKnowledgeLimitError,
  requireWorkspaceMember,
} from "@/lib/services/workspace-knowledge.service";
import { deductWorkspaceCredits, refundWorkspaceCredits } from "@/lib/services/credit.service";
import { CREDIT_PER_PAGE } from "@/config/credit";
import { ETransactionType } from "@/types";

export async function OPTIONS() {
  return NextResponse.json(null);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await requireWorkspaceMember(id, user.id);

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    // 1. Upload file to storage (workspace-scoped path)
    const uploadResult = await uploadKnowledgeFile(createAdminClient(), file, { workspaceId: id });
    if (!uploadResult.success || !uploadResult.url) {
      return NextResponse.json(
        { error: uploadResult.error || "Failed to upload knowledge file" },
        { status: 400 }
      );
    }

    const filePath = uploadResult.url;

    // 2. Deduct credits before processing
    const deductionResult = await deductWorkspaceCredits(createAdminClient(), {
      workspaceId: id,
      creditAmount: CREDIT_PER_PAGE,
      transactionType: ETransactionType.AddKnowledge,
      transactionDescription: `Deducted ${CREDIT_PER_PAGE} credits to add workspace knowledge for workspace ${id}`,
    });

    if (!deductionResult.success) {
      await deleteKnowledgeFile(createAdminClient(), filePath).catch(() => undefined);
      return NextResponse.json(
        { error: deductionResult.message || "Insufficient credits to add workspace knowledge." },
        { status: 400 }
      );
    }

    // 3. Extract text from file
    try {
      const { content, contentHash } = await extractFileContent(file, file.name, file.type);

      const knowledge = await insertWorkspaceKnowledge(createAdminClient(), {
        workspace_id: id,
        title: file.name,
        content: content || "File không chứa nội dung trích xuất được.",
        source_type: "file",
        metadata: {
          file_path: filePath,
          file_name: file.name,
          content_hash: contentHash,
        },
        created_by: user.id,
      });

      return NextResponse.json({ knowledge }, { status: 201 });
    } catch (err) {
      const errorMsg = (err as Error).message || "Failed to process file";
      await deleteKnowledgeFile(createAdminClient(), filePath).catch(() => undefined);

      await refundWorkspaceCredits(createAdminClient(), {
        workspaceId: id,
        deductedFromSubscription: deductionResult.deductedFromSubscription || 0,
        deductedFromPayg: deductionResult.deductedFromPayg || 0,
        transactionType: ETransactionType.AddKnowledgeRefund,
        transactionDescription: `Refunded ${CREDIT_PER_PAGE} credits due to an error while processing file for workspace ${id}`,
      }).catch(() => undefined);

      return NextResponse.json({ error: errorMsg }, { status: 500 });
    }
  } catch (err: unknown) {
    const error = err as Error;
    console.error("Error uploading workspace knowledge file:", error);
    if (error.message === "Unauthorized workspace access") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (isWorkspaceKnowledgeLimitError(error)) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: error.message || "Failed to upload workspace knowledge file" },
      { status: 500 }
    );
  }
}
