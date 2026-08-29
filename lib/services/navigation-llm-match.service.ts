import type { KeyActionPage } from "@/types";
import { getRedisPublisher } from "@/lib/config/redis";
import {
  DEFAULT_TIMEOUT_MS,
  CACHE_TTL_SECONDS,
  CONFIDENCE_THRESHOLD,
} from "@/config/navigation-intent";
import { EMessageRole } from "@/types";
import { NAVIGATION_LLM_INTENT_SYSTEM_PROMPT } from "@/lib/ai/prompt";

const NAVIGATION_USE_LLM =
  (process.env.NAVIGATION_USE_LLM_MATCH ?? "true").toLowerCase() !== "false";

const NAVIGATION_INTENT_MODEL =
  process.env.NAVIGATION_INTENT_MODEL || process.env.CHAT_MODEL || "gemini-3.1-flash-lite";

export interface LLMMatchResult {
  matched: boolean;
  path?: string;
  anchor?: string | null;
  confidence: number;
  reason?: string;
}

export interface MatchByLLMParams {
  botId: string;
  userMessage: string;
  conversationHistory: Array<{ role: "user" | "model"; content: string }>;
  candidates: KeyActionPage[];
  signal?: AbortSignal;
}

interface GeminiPart {
  text?: string;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: GeminiPart[] };
    finishReason?: string;
  }>;
}

/**
 * Truncate candidates to keep prompt size bounded.
 * Rules:
 *   - up to 30: send full
 *   - 31..100: drop description, keep core fields
 *   - >100: top-100 by intent length desc (proxy for specificity)
 */
function trimCandidates(candidates: KeyActionPage[]): KeyActionPage[] {
  if (candidates.length <= 30) return candidates;
  if (candidates.length <= 100) {
    return candidates.map(({ path, title, intent, anchor }) => ({
      path,
      title,
      intent,
      anchor: anchor ?? null,
    }));
  }
  return [...candidates]
    .sort((a, b) => (b.intent?.length ?? 0) - (a.intent?.length ?? 0))
    .slice(0, 100)
    .map(({ path, title, intent, anchor }) => ({
      path,
      title,
      intent,
      anchor: anchor ?? null,
    }));
}

function buildCacheKey(botId: string, message: string, lastUserMsg: string): string {
  // Lightweight hash: djb2 over message + lastUserMsg
  const combined = `${message}\n${lastUserMsg}`;
  let hash = 5381;
  for (let i = 0; i < combined.length; i++) {
    hash = ((hash << 5) + hash + combined.charCodeAt(i)) | 0;
  }
  return `nav-llm:${botId}:${(hash >>> 0).toString(36)}`;
}

async function callGeminiJSON(
  systemInstruction: string,
  userText: string,
  signal?: AbortSignal
): Promise<LLMMatchResult> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_API_KEY not configured");
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(NAVIGATION_INTENT_MODEL)}:generateContent?key=${apiKey}`;
  const body = {
    systemInstruction: { parts: [{ text: systemInstruction }] },
    contents: [{ role: "user", parts: [{ text: userText }] }],
    generationConfig: {
      temperature: 0,
      responseMimeType: "application/json",
    },
  };
  const init: RequestInit = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
  if (signal) init.signal = signal;
  const res = await fetch(url, init);
  if (!res.ok) {
    throw new Error(`Gemini HTTP ${res.status}`);
  }
  const data = (await res.json()) as GeminiResponse;
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Empty Gemini response");
  const parsed = JSON.parse(text) as LLMMatchResult;
  return parsed;
}

function lastUserMsg(history: MatchByLLMParams["conversationHistory"]): string {
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].role === "user") return history[i].content;
  }
  return "";
}

/**
 * LLM-first intent matcher. Returns null if disabled, no match, or on error
 * (caller should fall back to substring matching).
 */
export async function matchByLLM(
  params: MatchByLLMParams
): Promise<{ url: string; anchor: string | null; confidence: number } | null> {
  if (!NAVIGATION_USE_LLM) {
    console.log("[SmartHomepage] LLM matcher disabled (NAVIGATION_USE_LLM_MATCH=false)");
    return null;
  }
  if (params.candidates.length === 0) return null;

  const lastMsg = lastUserMsg(params.conversationHistory);
  const cacheKey = buildCacheKey(params.botId, params.userMessage, lastMsg);

  // Cache lookup
  try {
    const redis = await getRedisPublisher();
    const cached = await redis.get(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached) as LLMMatchResult;
      console.log("[SmartHomepage] LLM cache hit", { cacheKey, parsed });
      return toResult(parsed, "cache");
    }
  } catch {
    // Cache unavailable → continue without cache
  }

  const start = Date.now();
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const trimmed = trimCandidates(params.candidates);
    const historyText = params.conversationHistory
      .slice(-3)
      .map((h) => `${h.role === EMessageRole.User ? "Khách" : "Bot"}: ${h.content}`)
      .join("\n");
    const userText = `Lịch sử hội thoại gần nhất:\n${historyText || "(trống)"}\n\nTin nhắn hiện tại của khách: "${params.userMessage}"\n\nDanh sách trang khả dĩ (path, title, intent, anchor):\n${JSON.stringify(trimmed, null, 0)}`;

    const result = await callGeminiJSON(NAVIGATION_LLM_INTENT_SYSTEM_PROMPT, userText, ctl.signal);
    const latency = Date.now() - start;
    console.log("[SmartHomepage] LLM match", {
      model: NAVIGATION_INTENT_MODEL,
      latencyMs: latency,
      matched: result.matched,
      path: result.path ?? null,
      anchor: result.anchor ?? null,
      confidence: result.confidence,
      reason: result.reason ?? null,
      candidatesSent: trimmed.length,
    });

    // Cache result (1 minute)
    try {
      const redis = await getRedisPublisher();
      await redis.setex(cacheKey, CACHE_TTL_SECONDS, JSON.stringify(result));
    } catch {
      // ignore
    }

    return toResult(result, "fresh");
  } catch (err) {
    const latency = Date.now() - start;
    console.warn("[SmartHomepage] LLM match failed → fallback to substring", {
      latencyMs: latency,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function toResult(
  parsed: LLMMatchResult,
  source: "cache" | "fresh"
): { url: string; anchor: string | null; confidence: number } | null {
  if (!parsed || !parsed.matched) {
    if (source === "fresh") {
      console.log("[SmartHomepage] LLM said no match → falling through");
    }
    return null;
  }
  if (typeof parsed.path !== "string" || parsed.path.length === 0) return null;
  if (parsed.confidence < CONFIDENCE_THRESHOLD) {
    console.log("[SmartHomepage] LLM match below confidence threshold", {
      confidence: parsed.confidence,
      threshold: CONFIDENCE_THRESHOLD,
    });
    return null;
  }
  return {
    url: parsed.path,
    anchor: parsed.anchor ?? null,
    confidence: parsed.confidence,
  };
}

export interface PreflightResult {
  matched: boolean;
  url?: string;
  anchor?: string | null;
  title?: string;
  confidence?: number;
}

/**
 * Pre-flight check: call LLM match BEFORE chat generation so the system prompt
 * can be augmented with navigation context (FR-11). Returns a richer payload
 * (including the page title) than `matchByLLM` so callers can build context.
 */
export async function preflightNavigation(
  botId: string,
  userMessage: string,
  conversationHistory: Array<{ role: "user" | "model"; content: string }>,
  candidates: KeyActionPage[]
): Promise<PreflightResult> {
  const result = await matchByLLM({ botId, userMessage, conversationHistory, candidates });
  if (!result) return { matched: false };
  const page = candidates.find(
    (p) => p.path === result.url && (p.anchor ?? null) === (result.anchor ?? null)
  );
  return {
    matched: true,
    url: result.url,
    anchor: result.anchor ?? null,
    title: page?.title,
    confidence: result.confidence,
  };
}

/**
 * Build the navigation context block to inject into a chat system prompt.
 * Vietnamese-default, English fallback handled by Gemini.
 */
export function buildNavigationContextBlock(p: PreflightResult): string {
  if (!p.matched || !p.url) return "";
  const title = p.title || "trang liên quan";
  const url = p.url;
  return `\n# NAVIGATION CONTEXT (system)\nThe user is being navigated to: "${title}" at ${url} after this turn.\nIn your reply: (a) briefly acknowledge what they asked, (b) say you're taking them to ${title} in 1-2 sentences, (c) DO NOT use markdown headers/bullet lists, (d) keep it under 30 words.\nDo not invent details about the page. Do not duplicate the URL (the client will render the URL).\n`;
}
