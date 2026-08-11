import { randomUUID } from "crypto";
import type { ServiceClient } from "@/lib/services/types";
import { getEffectiveEntitlements } from "@/lib/services/entitlement.service";
import { deductWorkspaceCredits } from "@/lib/services/credit.service";
import { insertPageServer } from "@/lib/services/page.service";
import { addIndexerJob } from "@/lib/scraper/core/queue";
import { EBotStatus, ETransactionType, EPageStatus, EPageSourceType } from "@/types";
import { hashContent } from "@/lib/helpers";
import { CREDIT_PER_PAGE } from "@/config/credit";
import {
  BULK_IMPORT_DEFAULT_DOMAIN,
  BULK_IMPORT_DEFAULT_SOURCE_MODE,
} from "@/lib/constants/bulk-import";

import {
  RawBulkRow,
  ValidatedBulkRow,
  parseCSVString,
  validateBulkRows,
} from "@/lib/services/bulk-bot-validation";

export type { RawBulkRow, ValidatedBulkRow };
export { parseCSVString, validateBulkRows };

export interface BulkTemplateConfig {
  primaryColor?: string;
  isPublic?: boolean;
  personalityId?: string;
  personalityName?: string;
  skillIds?: string[];
  skillNames?: string[];
}

export interface BulkCreateOptions {
  workspaceId: string;
  ownerId: string;
  template: BulkTemplateConfig;
  rows: Array<{
    name: string;
    slug: string;
    avatarUrl?: string;
    knowledgeTitle: string;
    knowledgeContent: string;
  }>;
}

export interface BulkRowResult {
  index: number;
  botId?: string;
  name: string;
  slug: string;
  status: "created" | "error";
  errorReason?: string;
  pageId?: string;
  jobId?: string;
}

export interface BulkDryRunResult {
  quota: {
    planCode: string;
    botsLimit: number;
    currentCount: number;
    remaining: number;
  };
  credits: {
    remaining: number;
    needed: number;
  };
  rows: ValidatedBulkRow[];
  summary: {
    total: number;
    validCount: number;
    invalidCount: number;
    wouldCreate: number;
  };
  blocked: boolean;
  blockReason?: string;
}

export interface BulkCreateResponse {
  success: boolean;
  message?: string;
  summary: {
    total: number;
    createdCount: number;
    failedCount: number;
  };
  results: BulkRowResult[];
}

/**
      isValid: true,
    };
  });
}

/**
 * Check DB for existing slugs and flag invalid rows
 */
export async function generateUniqueSlugs(
  validatedRows: ValidatedBulkRow[],
  client: ServiceClient
): Promise<ValidatedBulkRow[]> {
  const validSlugs = validatedRows.filter((r) => r.isValid).map((r) => r.slug);

  if (validSlugs.length === 0) return validatedRows;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existingBots } = await (client as any)
    .from("bots")
    .select("slug")
    .in("slug", validSlugs);

  const existingSlugSet = new Set<string>(
    (existingBots || []).map((b: { slug: string }) => b.slug)
  );

  return validatedRows.map((row) => {
    if (row.isValid && existingSlugSet.has(row.slug)) {
      return {
        ...row,
        isValid: false,
        errorReason: `Slug "${row.slug}" đã tồn tại trong cơ sở dữ liệu`,
      };
    }
    return row;
  });
}

/**
 * Resolve personality name to personality_id
 */
export async function resolvePersonalityId(
  client: ServiceClient,
  personalityName?: string
): Promise<string | null> {
  if (!personalityName) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (client as any)
    .from("ai_personalities")
    .select("id")
    .eq("name", personalityName)
    .maybeSingle();

  return data?.id ?? null;
}

/**
 * Resolve skill names to skill_ids
 */
export async function resolveSkillIds(
  client: ServiceClient,
  skillNames?: string[]
): Promise<string[]> {
  if (!skillNames || skillNames.length === 0) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (client as any)
    .from("ai_skills")
    .select("id, name")
    .in("name", skillNames);

  return (data || []).map((s: { id: string }) => s.id);
}

/**
 * Perform Dry-Run preview & quota check
 */
export async function dryRunBulkCreate(
  client: ServiceClient,
  workspaceId: string,
  rawRows: RawBulkRow[]
): Promise<BulkDryRunResult> {
  const validatedRows = validateBulkRows(rawRows);
  const checkedRows = await generateUniqueSlugs(validatedRows, client);

  const entitlements = await getEffectiveEntitlements(client, workspaceId);
  const planCode = entitlements?.planCode ?? "free";
  const botsLimit = entitlements?.botsLimit ?? 1;

  // Count current bots in workspace
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count: currentBotCount } = await (client as any)
    .from("bots")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId);

  const currentCount = currentBotCount ?? 0;
  const remainingQuota = Math.max(0, botsLimit - currentCount);

  const validCount = checkedRows.filter((r) => r.isValid).length;
  const invalidCount = checkedRows.length - validCount;
  const wouldCreate = validCount;

  const creditsNeeded = validCount * CREDIT_PER_PAGE;
  const creditsRemaining = entitlements?.monthlyCredits ?? 0;

  let blocked = false;
  let blockReason: string | undefined;

  if (wouldCreate > remainingQuota) {
    blocked = true;
    blockReason = `File chứa ${wouldCreate} bot hợp lệ nhưng Workspace chỉ còn ${remainingQuota} lượt tạo (Giới hạn gói: ${botsLimit}).`;
  } else if (creditsNeeded > creditsRemaining && CREDIT_PER_PAGE > 0) {
    blocked = true;
    blockReason = `Cần ${creditsNeeded} credits để nạp kiến thức nhưng Workspace chỉ còn ${creditsRemaining} credits.`;
  }

  return {
    quota: {
      planCode,
      botsLimit,
      currentCount,
      remaining: remainingQuota,
    },
    credits: {
      remaining: creditsRemaining,
      needed: creditsNeeded,
    },
    rows: checkedRows,
    summary: {
      total: checkedRows.length,
      validCount,
      invalidCount,
      wouldCreate,
    },
    blocked,
    blockReason,
  };
}

/**
 * Execute actual batch bot creation
 */
export async function createBotsBulk(
  client: ServiceClient,
  options: BulkCreateOptions
): Promise<BulkCreateResponse> {
  const { workspaceId, ownerId, template, rows } = options;

  // 1. Resolve template assets
  const personalityId =
    template.personalityId || (await resolvePersonalityId(client, template.personalityName));
  const skillIds =
    template.skillIds && template.skillIds.length > 0
      ? template.skillIds
      : await resolveSkillIds(client, template.skillNames);

  // 2. Lock workspace row & check quota (Defense in depth)
  const entitlements = await getEffectiveEntitlements(client, workspaceId);
  const botsLimit = entitlements?.botsLimit ?? 1;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count: currentCount } = await (client as any)
    .from("bots")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId);

  const remainingQuota = Math.max(0, botsLimit - (currentCount ?? 0));

  if (rows.length > remainingQuota) {
    return {
      success: false,
      message: `Số lượng bot cần tạo (${rows.length}) vượt quá Quota còn lại của Workspace (${remainingQuota}).`,
      summary: { total: rows.length, createdCount: 0, failedCount: rows.length },
      results: rows.map((r, i) => ({
        index: i,
        name: r.name,
        slug: r.slug,
        status: "error",
        errorReason: "Workspace quota exceeded",
      })),
    };
  }

  const results: BulkRowResult[] = [];
  let createdCount = 0;
  let failedCount = 0;

  // 3. Batch process each bot
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const avatarUrl = row.avatarUrl?.trim() || null;

    try {
      // Insert bot
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: newBot, error: botErr } = await (client as any)
        .from("bots")
        .insert({
          user_id: ownerId,
          workspace_id: workspaceId,
          name: row.name,
          slug: row.slug,
          avatar_url: avatarUrl,
          domain: BULK_IMPORT_DEFAULT_DOMAIN,
          status: EBotStatus.Pending,
          is_public: template.isPublic ?? false,
          personality_id: personalityId,
          widget_settings: {
            primaryColor: template.primaryColor || "#3B82F6",
          },
          crawl_settings: {
            onboardingSourceMode: BULK_IMPORT_DEFAULT_SOURCE_MODE,
          },
        })
        .select("id")
        .single();

      if (botErr || !newBot) {
        failedCount += 1;
        results.push({
          index: i,
          name: row.name,
          slug: row.slug,
          status: "error",
          errorReason: botErr?.message || "Không thể khởi tạo bot",
        });
        continue;
      }

      const botId = newBot.id;

      // Insert skills junction
      if (skillIds.length > 0) {
        const skillRows = skillIds.map((skillId) => ({
          bot_id: botId,
          skill_id: skillId,
        }));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (client as any).from("bot_skills").insert(skillRows);
      }

      // Insert knowledge page
      const pageId = randomUUID();
      const pageUrl = `manual://${randomUUID()}`;

      await insertPageServer(client, {
        id: pageId,
        bot_id: botId,
        url: pageUrl,
        title: row.knowledgeTitle,
        content: row.knowledgeContent,
        raw_content: row.knowledgeContent,
        content_hash: hashContent(row.knowledgeContent),
        source_type: EPageSourceType.ManualText,
        status: EPageStatus.PendingIndex,
        crawled_at: new Date().toISOString(),
      });

      // Update bot status to Indexing
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (client as any).from("bots").update({ status: EBotStatus.Indexing }).eq("id", botId);

      // Enqueue Indexer Job
      const jobId = await addIndexerJob({ botId, pageId });

      // Deduct credits if applicable
      if (CREDIT_PER_PAGE > 0) {
        await deductWorkspaceCredits(client, {
          workspaceId,
          creditAmount: CREDIT_PER_PAGE,
          transactionType: ETransactionType.AddKnowledge,
          transactionDescription: `Deducted ${CREDIT_PER_PAGE} credit for initial bulk knowledge page on bot ${botId}`,
        });
      }

      createdCount += 1;
      results.push({
        index: i,
        botId,
        name: row.name,
        slug: row.slug,
        status: "created",
        pageId,
        jobId,
      });
    } catch (err) {
      failedCount += 1;
      results.push({
        index: i,
        name: row.name,
        slug: row.slug,
        status: "error",
        errorReason: err instanceof Error ? err.message : "Unspecified error",
      });
    }
  }

  return {
    success: true,
    summary: {
      total: rows.length,
      createdCount,
      failedCount,
    },
    results,
  };
}
