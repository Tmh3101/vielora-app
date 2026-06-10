import type { Job } from "bullmq";
import { randomUUID } from "node:crypto";
import { getRedisPublisher } from "@/lib/config/redis";
import { extractContent } from "@/lib/scraper/extractors";
import { processLinks, extractBaseDomain, normalizeUrl } from "./link-processor";
import { addIndexerJob, getPageCrawlerQueue } from "./queue";
import { ensureProtocol } from "@/lib/helpers";
import { createJobRecord as _createJobRecord, updateJobProgress } from "@/lib/services/job.service";
import {
  countPagesByBotIdAndStatusesServer,
  updatePageServer,
  getPageByIdServer,
  deleteDocumentsByPageUrl,
  insertDocumentsServer,
} from "@/lib/services/page.service";
import { setBotStatusIfNotReadyServer } from "@/lib/services/bot.service";
import {
  upsertPageContent,
  finalizeBotIfDone,
  publishProgress,
} from "@/lib/services/worker.service";
import type {
  CrawlJob,
  CrawlResult,
  DiscoverJobData,
  IndexerJobData,
  PageCrawlerJobData,
  RenderModeType,
  PageContent,
} from "@/types";
import { EBotStatus, EPageStatus, ETransactionType } from "@/types";
import {
  RenderMode as RenderModeEnum,
  DISCOVERED_PAGE_STATUSES,
  DISCOVER_PENDING_KEY_PREFIX,
  DISCOVER_SEEN_KEY_PREFIX,
} from "@/lib/constants";
import { createAdminClient } from "@/lib/supabase/server";
import type { TablesInsert } from "@/lib/supabase/types";
import { hashContent, fetchSitemapUrls, isSoft404, getJobProgressStreamId } from "@/lib/helpers";
import { refundCredits } from "@/lib/services/credit.service";
import { createChunks, embedChunks } from "@/lib/rag-processor";
import { CREDIT_PER_PAGE, MAX_PAGES, MAX_DEPTH, MIN_CHUNK_SIZE } from "@/config";
import { sleep } from "@/lib/utils/sleep";

// Debounce finalizeBotIfDone per botId to prevent burst COUNT queries on concurrent completions
const finalizeDebounceMap = new Map<string, ReturnType<typeof setTimeout>>();
const debouncedFinalizeBotIfDone = (botId: string, delayMs = 2000): void => {
  const existing = finalizeDebounceMap.get(botId);
  if (existing) clearTimeout(existing);
  finalizeDebounceMap.set(
    botId,
    setTimeout(() => {
      finalizeDebounceMap.delete(botId);
      void finalizeBotIfDone(botId);
    }, delayMs)
  );
};

const getDiscoverPendingKey = (discoverJobId: string): string =>
  `${DISCOVER_PENDING_KEY_PREFIX}:${discoverJobId}`;
const getDiscoverSeenKey = (discoverJobId: string): string =>
  `${DISCOVER_SEEN_KEY_PREFIX}:${discoverJobId}`;

const refundSingleUrlKnowledgeCredits = async (
  supabase: ReturnType<typeof createAdminClient>,
  jobData: PageCrawlerJobData
): Promise<void> => {
  const refund = jobData.creditRefund;
  if (!refund) return;

  await refundCredits(supabase, {
    userId: refund.userId,
    deductedFromSubscription: refund.deductedFromSubscription,
    deductedFromPayg: refund.deductedFromPayg,
    transactionType: ETransactionType.AddKnowledgeRefund,
    transactionDescription: `Refunded ${refund.creditAmount || CREDIT_PER_PAGE} credits due to an error while adding URL knowledge for bot ${jobData.botId}`,
  });
};

const failSingleUrlKnowledgeJob = async (
  supabase: ReturnType<typeof createAdminClient>,
  jobData: PageCrawlerJobData,
  message: string
): Promise<never> => {
  if (jobData.pageId) {
    await updatePageServer(supabase, jobData.pageId, {
      status: EPageStatus.Failed,
      error_message: message,
      crawled_at: new Date().toISOString(),
    });
  }

  await refundSingleUrlKnowledgeCredits(supabase, jobData);
  debouncedFinalizeBotIfDone(jobData.botId);
  throw new Error(message);
};

export const processDiscoverJob = async (job: Job<DiscoverJobData>): Promise<void> => {
  const { botId, startUrl, config } = job.data;
  console.log(`Starting job for botId=${botId}, startUrl=${startUrl}`);
  const supabase = createAdminClient();

  const normalizedStartUrl = normalizeUrl(ensureProtocol(startUrl));
  const maxPages = Math.max(config?.maxPages ?? MAX_PAGES, 1);
  const maxDepth = Math.max(config?.maxDepth ?? MAX_DEPTH, 0);
  const startHostname = new URL(normalizedStartUrl).hostname;
  const baseDomain = extractBaseDomain(normalizedStartUrl);
  const discoverJobId = String(job.id ?? job.data.requestId);
  const pendingKey = getDiscoverPendingKey(discoverJobId);
  const seenKey = getDiscoverSeenKey(discoverJobId);

  console.log("[DiscoverJob] Starting discover run", {
    botId,
    discoverJobId,
    seedUrl: normalizedStartUrl,
    includeSubdomains: config?.includeSubdomains ?? true,
    startHostname,
    baseDomain,
    maxPages,
    maxDepth,
  });

  await setBotStatusIfNotReadyServer(supabase, botId, EBotStatus.Discovering);
  void job.updateProgress({ percent: 0, currentUrl: normalizedStartUrl });

  const seedDepthByUrl = new Map<string, number>();
  seedDepthByUrl.set(normalizedStartUrl, 0);
  const sitemapUrls = await fetchSitemapUrls(normalizedStartUrl, maxPages);

  console.log("[DiscoverJob] Fetched sitemap URLs:", sitemapUrls);

  for (const sitemapUrl of sitemapUrls) {
    const normalizedSitemapUrl = normalizeUrl(sitemapUrl);
    if (!normalizedSitemapUrl || seedDepthByUrl.has(normalizedSitemapUrl)) continue;
    seedDepthByUrl.set(normalizedSitemapUrl, 1);
    if (seedDepthByUrl.size >= maxPages) break;
  }

  const initialSeeds = Array.from(seedDepthByUrl.entries()).slice(0, maxPages);
  const redis = await getRedisPublisher();
  await redis.del(seenKey);
  await redis.set(pendingKey, initialSeeds.length.toString());
  if (initialSeeds.length > 0) {
    await redis.sadd(seenKey, ...initialSeeds.map(([url]) => url));
  }

  if (initialSeeds.length > 0) {
    const pageCrawlerQueue = getPageCrawlerQueue();
    await pageCrawlerQueue.addBulk(
      initialSeeds.map(([url, depth]) => ({
        name: `page-crawl:${botId}:${url}`,
        data: {
          botId,
          currentUrl: url,
          depth,
          discoverJobId,
          startHostname,
          baseDomain,
          maxPages,
          maxDepth,
          config,
        },
        opts: { attempts: 1 },
      }))
    );
  }

  let isDiscovering = true;
  while (isDiscovering) {
    const [pendingRaw, discoveredCount, seenCount] = await Promise.all([
      redis.get(pendingKey),
      countPagesByBotIdAndStatusesServer(supabase, botId, DISCOVERED_PAGE_STATUSES),
      redis.scard(seenKey),
    ]);

    console.log("[DiscoverJob] Polling progress", {
      pending: pendingRaw,
      discoveredCount,
      seenCount,
    });

    const pendingJobs = Number.parseInt(pendingRaw ?? "0", 10);
    if (pendingJobs <= 0) {
      await Promise.all([redis.del(pendingKey), redis.del(seenKey)]);
      await setBotStatusIfNotReadyServer(
        supabase,
        botId,
        discoveredCount > 0 ? EBotStatus.Discovered : EBotStatus.Failed
      );
      void job.updateProgress({ percent: 100, currentUrl: normalizedStartUrl });
      isDiscovering = false;
      return;
    }

    const progressPercent = Math.min(
      99,
      Math.round((Math.min(seenCount, maxPages) / maxPages) * 100)
    );
    void job.updateProgress({ percent: progressPercent });
    await sleep(1000);
  }
};

export const processPageCrawlerJob = async (job: Job<PageCrawlerJobData>): Promise<void> => {
  const {
    botId,
    currentUrl,
    depth,
    discoverJobId,
    startHostname,
    baseDomain,
    maxPages,
    maxDepth,
    config,
  } = job.data;
  const isSingleUrlKnowledge = job.data.mode === "single_url_knowledge";
  const redis = isSingleUrlKnowledge ? null : await getRedisPublisher();
  const pendingKey = isSingleUrlKnowledge ? null : getDiscoverPendingKey(discoverJobId);
  const seenKey = isSingleUrlKnowledge ? null : getDiscoverSeenKey(discoverJobId);
  const renderMode: RenderModeType = config?.renderMode ?? RenderModeEnum.AUTO;

  try {
    const crawlJob: CrawlJob = {
      id: randomUUID(),
      url: currentUrl,
      type: "scrape",
      depth,
      baseDomain,
      config,
      createdAt: Date.now(),
    };

    console.log("[PageCrawlerJob] Processing URL:", {
      botId,
      currentUrl,
      depth,
      discoverJobId,
      renderMode,
    });

    let result: CrawlResult;
    const pageTimeoutMs = isSingleUrlKnowledge
      ? (config?.timeout ?? 30000)
      : (config?.timeout ?? 30000) * 3;

    console.log(
      `[PageCrawlerJob] Starting content extraction for URL: ${currentUrl} with timeout ${pageTimeoutMs}ms`
    );
    try {
      result = await Promise.race([
        extractContent(crawlJob, renderMode),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error(`Page timed out after ${pageTimeoutMs}ms`)),
            pageTimeoutMs
          )
        ),
      ]);
    } catch (error) {
      result = {
        success: false,
        url: currentUrl,
        jobId: crawlJob.id,
        title: "",
        html: "",
        markdown: "",
        error: error instanceof Error ? error.message : "Unknown crawl error",
        links: [],
        processingTimeMs: 0,
      };
    }

    console.log("[PageCrawlerJob] Extracted content for URL:", {
      success: result.success,
      currentUrl,
      title: result.title,
      contentLength: result.markdown.length,
      linksCount: result.links?.length ?? 0,
    });

    if (isSingleUrlKnowledge) {
      const supabase = createAdminClient();

      try {
        if (!job.data.pageId) {
          throw new Error("Missing pageId for single URL knowledge crawl");
        }

        if (!result.success) {
          throw new Error(result.error || "Unable to crawl this URL.");
        }

        if (isSoft404(result.title, result.markdown)) {
          throw new Error("No indexable content was found.");
        }

        const normalizedContent = result.markdown.trim();
        if (normalizedContent.length < MIN_CHUNK_SIZE) {
          throw new Error("No indexable content was found at this URL.");
        }

        await updatePageServer(supabase, job.data.pageId, {
          title: result.title?.trim() || currentUrl,
          content: normalizedContent,
          raw_content: result.rawHtml || result.html || normalizedContent,
          content_hash: hashContent(normalizedContent),
          status: EPageStatus.PendingIndex,
          error_message: null,
          crawled_at: new Date().toISOString(),
        });

        const indexerJobId = await addIndexerJob({
          botId,
          pageId: job.data.pageId,
          creditRefund: job.data.creditRefund,
        });

        void job.updateProgress({ percent: 100, currentUrl });
        console.log("[PageCrawlerJob] Queued indexer for single URL knowledge:", {
          botId,
          pageId: job.data.pageId,
          indexerJobId,
        });
      } catch (error) {
        await failSingleUrlKnowledgeJob(
          supabase,
          job.data,
          error instanceof Error ? error.message : String(error)
        );
      }
      return;
    }

    if (!result.success || isSoft404(result.title, result.markdown)) {
      return;
    }

    try {
      await upsertPageContent({
        botId,
        url: currentUrl,
        title: result.title,
        rawContent: result.rawHtml || result.html,
        content: result.markdown,
        depth,
        contentHash: hashContent(result.markdown),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : "";
      if (!message.includes("duplicate key value")) {
        throw error;
      }
    }

    const seenCount = await redis!.scard(seenKey!);
    const progressPercent = Math.min(
      100,
      Math.round((Math.min(seenCount, maxPages) / maxPages) * 100)
    );
    await updateJobProgress(createAdminClient(), discoverJobId, progressPercent, {
      current_url: currentUrl,
    });
    publishProgress(getJobProgressStreamId(discoverJobId), progressPercent, currentUrl);

    if (depth >= maxDepth) return;

    const linkResult = processLinks("", {
      baseUrl: currentUrl,
      startHostname,
      baseDomain,
      includeSubdomains: config?.includeSubdomains ?? true,
      includePatterns: config?.includePatterns,
      excludePatterns: config?.excludePatterns,
      preExtractedLinks: result.links ?? [],
    });

    console.log("[PageCrawlerJob] Processed links for URL:", {
      currentUrl,
      validUrls: linkResult.validUrls,
      filteredCount: linkResult.filteredCount,
    });

    const remainingSlots = Math.max(maxPages - seenCount, 0);
    if (remainingSlots <= 0) return;

    const childUrls: string[] = [];
    for (const url of linkResult.validUrls) {
      if (childUrls.length >= remainingSlots) break;
      const added = await redis.sadd(seenKey, url);
      if (added === 1) {
        childUrls.push(url);
      }
    }

    if (childUrls.length === 0) return;

    await redis.incrby(pendingKey, childUrls.length);
    try {
      const pageCrawlerQueue = getPageCrawlerQueue();
      await pageCrawlerQueue.addBulk(
        childUrls.map((url) => ({
          name: `page-crawl:${botId}:${url}`,
          data: {
            botId,
            currentUrl: url,
            depth: depth + 1,
            discoverJobId,
            startHostname,
            baseDomain,
            maxPages,
            maxDepth,
            config,
          },
          opts: { attempts: 1 },
        }))
      );
    } catch (error) {
      await redis!.decrby(pendingKey!, childUrls.length);
      throw error;
    }
  } finally {
    if (pendingKey && redis) {
      await redis.decr(pendingKey);
    }
  }
};

export const processIndexerJob = async (job: Job<IndexerJobData>): Promise<void> => {
  const { botId, pageId } = job.data;
  const supabase = createAdminClient();

  const page = await getPageByIdServer(supabase, pageId);

  if (!page) {
    return;
  }

  void job.updateProgress({ percent: 0, currentUrl: page.url });

  if (!page.content) {
    await updatePageServer(supabase, pageId, {
      status: EPageStatus.Failed,
      error_message: "Missing content",
    });
    if (job.data.creditRefund) {
      await refundCredits(supabase, {
        userId: job.data.creditRefund.userId,
        deductedFromSubscription: job.data.creditRefund.deductedFromSubscription,
        deductedFromPayg: job.data.creditRefund.deductedFromPayg,
        transactionType: ETransactionType.AddKnowledgeRefund,
        transactionDescription: `Refunded ${
          job.data.creditRefund.creditAmount || CREDIT_PER_PAGE
        } credits due to missing content while adding URL knowledge for bot ${botId}`,
      });
    }
    debouncedFinalizeBotIfDone(botId);
    return;
  }

  try {
    const pageContent: PageContent = {
      url: page.url,
      title: page.title || page.url,
      content: page.content,
    };
    const chunks = createChunks([pageContent]);
    const embedded = await embedChunks(chunks);

    await deleteDocumentsByPageUrl(supabase, botId, page.url);
    if (embedded.length > 0) {
      const docsToInsert: TablesInsert<"documents">[] = embedded.map((doc) => ({
        bot_id: botId,
        content: doc.content,
        metadata: {
          ...doc.metadata,
          pageId: page.id,
          url: page.url,
        },
        embedding: `[${doc.embedding.join(",")}]`,
      }));

      await insertDocumentsServer(supabase, docsToInsert);
    }

    await updatePageServer(supabase, pageId, {
      content_hash: hashContent(page.content),
      status: EPageStatus.Completed,
      error_message: null,
      crawled_at: new Date().toISOString(),
    });

    void job.updateProgress({ percent: 100, currentUrl: page.url });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to index page";
    await updatePageServer(supabase, pageId, {
      status: EPageStatus.Failed,
      error_message: errorMessage,
    });
    if (job.data.creditRefund) {
      await refundCredits(supabase, {
        userId: job.data.creditRefund.userId,
        deductedFromSubscription: job.data.creditRefund.deductedFromSubscription,
        deductedFromPayg: job.data.creditRefund.deductedFromPayg,
        transactionType: ETransactionType.AddKnowledgeRefund,
        transactionDescription: `Refunded ${
          job.data.creditRefund.creditAmount || CREDIT_PER_PAGE
        } credits due to an indexing error while adding URL knowledge for bot ${botId}`,
      });
    }
    void job.updateProgress({ percent: 100, currentUrl: page.url });
  }

  debouncedFinalizeBotIfDone(botId);
};
