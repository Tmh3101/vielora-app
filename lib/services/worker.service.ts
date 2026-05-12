import {
  getPageByBotIdAndUrlServer,
  insertPageServer,
  updatePageServer,
  countPagesByBotIdAndStatusesServer,
} from "@/lib/services/page.service";
import { setBotReadyServer, setBotStatusIfNotReadyServer } from "@/lib/services/bot.service";
import { getRedisPublisher } from "@/lib/config/redis";
import { EBotStatus, EPageStatus, EPageErrorType } from "@/types";
import { createAdminClient } from "@/lib/supabase/server";
import { getRedisConnectionOptions } from "@/lib/config/redis";
import { NextRequest } from "next/server";

interface WorkerProgress {
  percent: number;
  currentUrl?: string;
}

export const upsertPageContent = async (params: {
  botId: string;
  url: string;
  title?: string;
  rawContent?: string;
  content?: string;
  depth?: number;
  contentHash: string;
  errorMessage?: string;
  errorType?: EPageErrorType;
  httpStatusCode?: number;
}) => {
  const supabase = createAdminClient();
  const crawledAt = new Date().toISOString();

  const existingPage = await getPageByBotIdAndUrlServer(supabase, params.botId, params.url);
  if (!existingPage) {
    await insertPageServer(supabase, {
      bot_id: params.botId,
      url: params.url,
      title: params.title ?? null,
      raw_content: params.rawContent ?? null,
      content: params.content ?? null,
      status: EPageStatus.Pending,
      depth: params.depth ?? null,
      content_hash: params.contentHash ?? null,
      error_message: params.errorMessage ?? null,
      error_type: params.errorType ?? null,
      http_status_code: params.httpStatusCode ?? null,
      crawled_at: crawledAt,
    });
    return;
  }

  const isContentChanged = existingPage.content_hash !== params.contentHash;

  if (isContentChanged || existingPage.status === EPageStatus.Failed) {
    await updatePageServer(supabase, existingPage.id, {
      title: params.title ?? existingPage.title,
      raw_content: params.rawContent ?? existingPage.raw_content,
      content: params.content ?? existingPage.content,
      status: EPageStatus.Pending,
      depth: params.depth ?? existingPage.depth,
      content_hash: params.contentHash ?? existingPage.content_hash,
      error_message: params.errorMessage ?? existingPage.error_message,
      error_type: params.errorType ?? existingPage.error_type,
      http_status_code: params.httpStatusCode ?? existingPage.http_status_code,
      crawled_at: crawledAt,
    });
    return;
  }

  if (!isContentChanged && existingPage.status === EPageStatus.Completed) {
    await updatePageServer(supabase, existingPage.id, {
      crawled_at: crawledAt,
    });
  }
};

export const finalizeBotIfDone = async (botId: string): Promise<void> => {
  const supabase = createAdminClient();

  const [pendingCount, completedCount, ignoredCount] = await Promise.all([
    countPagesByBotIdAndStatusesServer(supabase, botId, [
      EPageStatus.PendingIndex,
      EPageStatus.Processing,
    ]),
    countPagesByBotIdAndStatusesServer(supabase, botId, EPageStatus.Completed),
    countPagesByBotIdAndStatusesServer(supabase, botId, EPageStatus.Ignored),
  ]);

  if (pendingCount > 0) return;

  const completed = completedCount;
  const ignored = ignoredCount;

  if (completed + ignored > 0) {
    await setBotReadyServer(supabase, botId);
    return;
  }

  await setBotStatusIfNotReadyServer(supabase, botId, EBotStatus.Failed);
};

export const normalizeWorkerProgress = (progress: unknown): WorkerProgress => {
  if (typeof progress === "number") {
    return { percent: progress };
  }

  if (typeof progress === "object" && progress !== null) {
    const payload = progress as Record<string, unknown>;
    const percent =
      typeof payload.percent === "number"
        ? payload.percent
        : typeof payload.progress === "number"
          ? payload.progress
          : 0;
    const currentUrl = typeof payload.currentUrl === "string" ? payload.currentUrl : undefined;
    return { percent, currentUrl };
  }

  return { percent: 0 };
};

export const publishProgress = (jobId: string, percent: number, currentUrl?: string): void => {
  void getRedisPublisher().then((pub) =>
    pub.publish(jobId, JSON.stringify({ progress: percent, data: { current_url: currentUrl } }))
  );
};

export const subscribeStreamChanel = async (channelName: string, request: NextRequest) => {
  const IORedis = (await import("ioredis")).default;
  const { maxRetriesPerRequest: _mr, ...opts } = getRedisConnectionOptions();
  const subscriber = new IORedis(opts);

  const stream = new ReadableStream({
    start(controller) {
      subscriber.subscribe(channelName);

      subscriber.on("message", (_ch, message) => {
        controller.enqueue(new TextEncoder().encode(`data: ${message}\n\n`));
      });

      const heartbeat = setInterval(() => {
        controller.enqueue(new TextEncoder().encode(": ping\n\n"));
      }, 20_000);

      request.signal.onabort = () => {
        clearInterval(heartbeat);
        subscriber
          .unsubscribe(channelName)
          .then(() => subscriber.quit())
          .catch((err) => console.log("[SSE] Redis cleanup (ignored):", err.message));
        try {
          controller.close();
        } catch (e) {
          console.log("[SSE] Stream cleanup (ignored):", (e as Error).message);
        }
      };
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
};
