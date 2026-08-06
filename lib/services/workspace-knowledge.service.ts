import { createAdminClient } from "@/lib/supabase/admin";
import type { ServiceClient } from "@/lib/services/types";
import type { Json } from "@/lib/supabase/types";
import { addWorkspaceKnowledgeJob } from "@/lib/scraper/core/queue";
import { deleteKnowledgeFile } from "@/lib/supabase/upload";
import { deleteWorkspaceKnowledgeChunks, insertDocumentsServer } from "@/lib/services/page.service";
import type { ProcessedDocument } from "@/lib/rag-processor";
import type { TablesInsert } from "@/lib/supabase/types";
import { EWorkspaceMemberStatus } from "@/types";

export interface WorkspaceKnowledgeRow {
  id: string;
  workspace_id: string;
  title: string;
  content: string;
  source_type: string;
  metadata: Record<string, unknown> | null;
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface InsertWorkspaceKnowledgeInput {
  workspace_id: string;
  title: string;
  content: string;
  source_type: string;
  metadata?: Record<string, unknown> | null;
  created_by?: string | null;
}

/**
 * Verify the user is an active member of the workspace.
 * Uses the admin client (service role) so the check is not subject to
 * RLS policies on workspace_members — consistent with WorkspaceService.
 * Throws on failure — reuse in every workspace-scoped knowledge endpoint.
 */
export async function requireWorkspaceMember(workspaceId: string, userId: string): Promise<void> {
  const supabase = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("workspace_members")
    .select("role_id")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .eq("status", EWorkspaceMemberStatus.Active)
    .maybeSingle();

  if (error || !data) {
    throw new Error("Unauthorized workspace access");
  }
}

/**
 * Verify the user is an active member of the workspace AND has a specific permission.
 * Fetches the member's role and checks the permissions JSON for the given key.
 * Throws on failure.
 */
export async function requireWorkspacePermission(
  workspaceId: string,
  userId: string,
  permission: string
): Promise<void> {
  const supabase = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("workspace_members")
    .select("role_id, workspace_roles!inner(permissions)")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .eq("status", EWorkspaceMemberStatus.Active)
    .maybeSingle();

  if (error || !data) {
    throw new Error("Unauthorized workspace access");
  }

  const permissions = data?.workspace_roles?.permissions as Record<string, boolean> | undefined;
  if (!permissions || permissions[permission] !== true) {
    throw new Error(`Insufficient permissions: ${permission} required`);
  }
}

/**
 * Detect the plan-limit trigger error raised by enforce_workspace_knowledge_limit.
 */
export function isWorkspaceKnowledgeLimitError(err: unknown): boolean {
  return err instanceof Error && err.message.includes("knowledge limit reached");
}

/**
 * Insert a workspace knowledge item and enqueue an async embedding job.
 * The chunking + embedding pipeline is shared with bot knowledge
 * (createChunks + embedChunks → documents table).
 */
export async function insertWorkspaceKnowledge(
  supabase: ServiceClient,
  input: InsertWorkspaceKnowledgeInput
): Promise<WorkspaceKnowledgeRow> {
  const { data, error } = await supabase
    .from("workspace_knowledge")
    .insert({
      workspace_id: input.workspace_id,
      title: input.title,
      content: input.content,
      source_type: input.source_type,
      metadata: (input.metadata ?? {}) as Json,
      created_by: input.created_by ?? null,
      status: "indexing",
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Failed to create shared knowledge");

  const row = data as unknown as WorkspaceKnowledgeRow;

  // Enqueue async embedding job; roll back the row if enqueue fails
  // so no item is left stuck in "indexing" without chunks.
  try {
    await addWorkspaceKnowledgeJob(row.id, row.workspace_id);
  } catch (enqueueError) {
    try {
      await supabase
        .from("workspace_knowledge")
        .delete()
        .eq("id", row.id)
        .eq("workspace_id", row.workspace_id);
    } catch {
      // Best-effort rollback — the enqueue error is the one surfaced.
    }
    throw enqueueError;
  }

  return row;
}

/**
 * Update a workspace knowledge item and re-enqueue the embedding job
 * so chunks stay in sync with the edited content.
 */
export async function updateWorkspaceKnowledge(
  supabase: ServiceClient,
  workspaceId: string,
  itemId: string,
  updates: { title?: string; content?: string; source_type?: string }
): Promise<WorkspaceKnowledgeRow | null> {
  const { data, error } = await supabase
    .from("workspace_knowledge")
    .update({
      ...updates,
      status: "indexing",
      updated_at: new Date().toISOString(),
    })
    .eq("id", itemId)
    .eq("workspace_id", workspaceId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const row = data as unknown as WorkspaceKnowledgeRow;

  // Re-enqueue embedding job; revert status if enqueue fails so the item
  // does not stay stuck in "indexing".
  try {
    await addWorkspaceKnowledgeJob(row.id, row.workspace_id);
  } catch (enqueueError) {
    try {
      await supabase
        .from("workspace_knowledge")
        .update({ status: "active" })
        .eq("id", row.id)
        .eq("workspace_id", row.workspace_id);
    } catch {
      // Best-effort status revert — the enqueue error is the one surfaced.
    }
    throw enqueueError;
  }

  return row;
}

/**
 * Delete a workspace knowledge item together with its document chunks
 * and the uploaded storage file (if any) — no orphaned data.
 */
export async function deleteWorkspaceKnowledge(
  supabase: ServiceClient,
  workspaceId: string,
  itemId: string
): Promise<{ success: boolean; fileDeleted?: boolean }> {
  const activeClient = createAdminClient();

  // 1. Fetch item to resolve storage file path
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: item } = await (activeClient as any)
    .from("workspace_knowledge")
    .select("metadata")
    .eq("id", itemId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  let fileDeleted = false;
  if (item?.metadata?.file_path) {
    const result = await deleteKnowledgeFile(activeClient, item.metadata.file_path);
    fileDeleted = result.success;
  }

  // 2. Delete embedding chunks
  await deleteWorkspaceKnowledgeChunks(activeClient, workspaceId, itemId);

  // 3. Delete the item row
  const { error } = await activeClient
    .from("workspace_knowledge")
    .delete()
    .eq("id", itemId)
    .eq("workspace_id", workspaceId);

  if (error) throw new Error(error.message);
  return { success: true, fileDeleted };
}

/**
 * Fetch a workspace knowledge item by id (scoped to its workspace).
 * Used by the async indexing worker. Returns null when not found.
 */
export async function getWorkspaceKnowledgeItemServer(
  supabase: ServiceClient,
  itemId: string,
  workspaceId: string
): Promise<WorkspaceKnowledgeRow | null> {
  const { data, error } = await supabase
    .from("workspace_knowledge")
    .select("*")
    .eq("id", itemId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as unknown as WorkspaceKnowledgeRow) ?? null;
}

/**
 * Replace the document chunks of a workspace knowledge item.
 * Deletes existing chunks for the item first (idempotent re-index on edit),
 * then inserts the freshly embedded chunks into the shared documents table.
 */
export async function replaceWorkspaceKnowledgeChunks(
  supabase: ServiceClient,
  workspaceId: string,
  itemId: string,
  sourceType: string,
  embedded: ProcessedDocument[]
): Promise<void> {
  await deleteWorkspaceKnowledgeChunks(supabase, workspaceId, itemId);
  if (embedded.length === 0) return;

  const docsToInsert: TablesInsert<"documents">[] = embedded.map((doc) => ({
    workspace_id: workspaceId,
    content: doc.content,
    metadata: {
      ...doc.metadata,
      itemId,
      source_type: sourceType,
    },
    embedding: `[${doc.embedding.join(",")}]`,
  }));

  await insertDocumentsServer(supabase, docsToInsert);
}

/**
 * Transition a workspace knowledge item to a new indexing status.
 * "failed" may carry extra metadata (e.g. error_message).
 */
export async function setWorkspaceKnowledgeStatus(
  supabase: ServiceClient,
  itemId: string,
  workspaceId: string,
  status: "active" | "failed",
  metadata?: Record<string, unknown> | null
): Promise<void> {
  const patch: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (metadata) patch.metadata = metadata as Json;

  const { error } = await supabase
    .from("workspace_knowledge")
    .update(patch as Json)
    .eq("id", itemId)
    .eq("workspace_id", workspaceId);

  if (error) throw new Error(error.message);
}
