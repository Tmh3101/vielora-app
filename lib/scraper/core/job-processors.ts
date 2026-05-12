import type { Job } from "bullmq";
import { randomUUID } from "node:crypto";
import { getRedisPublisher } from "@/lib/config/redis";
import { extractContent } from "@/lib/scraper/extractors";
import { processLinks, extractBaseDomain, normalizeUrl } from "./link-processor";
import { getPageCrawlerQueue } from "./queue";
import { ensureProtocol } from "@/lib/helpers/url-helpers";
import { createJobRecord as _createJobRecord } from "@/lib/services/job.service";
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
import { EBotStatus, EPageStatus } from "@/types";
import {
  RenderMode as RenderModeEnum,
  DISCOVERED_PAGE_STATUSES,
  DISCOVER_PENDING_KEY_PREFIX,
  DISCOVER_SEEN_KEY_PREFIX,
} from "@/lib/constants";
import { createAdminClient } from "@/lib/supabase/server";
import type { TablesInsert } from "@/lib/supabase/types";
import { hashContent, fetchSitemapUrls, isSoft404 } from "@/lib/helpers/crawl-website-helpers";
import { createChunks, embedChunks } from "@/lib/rag-processor";
import { MAX_PAGES, MAX_DEPTH } from "@/config/scraper";
import { getJobProgressStreamId } from "@/lib/helpers/job-tracker-helpers";
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
  const redis = await getRedisPublisher();
  const pendingKey = getDiscoverPendingKey(discoverJobId);
  const seenKey = getDiscoverSeenKey(discoverJobId);
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

    let result: CrawlResult;
    const pageTimeoutMs = (config?.timeout ?? 30000) * 2;
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
        error: error instanceof Error ? error.message : "Unknown discover error",
        processingTimeMs: 0,
      };
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

    const seenCount = await redis.scard(seenKey);
    const progressPercent = Math.min(
      100,
      Math.round((Math.min(seenCount, maxPages) / maxPages) * 100)
    );
    publishProgress(getJobProgressStreamId(discoverJobId), progressPercent, currentUrl);

    if (depth >= maxDepth) return;

    const linkResult = processLinks("", {
      baseUrl: currentUrl,
      startHostname,
      baseDomain,
      includeSubdomains: config?.includeSubdomains ?? true,
      includePatterns: config?.includePatterns,
      excludePatterns: config?.excludePatterns,
      preExtractedLinks: result.links,
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
      await redis.decrby(pendingKey, childUrls.length);
      throw error;
    }
  } finally {
    await redis.decr(pendingKey);
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
    await updatePageServer(supabase, pageId, {
      status: EPageStatus.Failed,
      error_message: error instanceof Error ? error.message : "Failed to index page",
    });
    void job.updateProgress({ percent: 100, currentUrl: page.url });
  }

  debouncedFinalizeBotIfDone(botId);
};
