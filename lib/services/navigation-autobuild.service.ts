/**
 * Auto-Populate Navigation from Website Discover (FR-9, Smart Homepage).
 *
 * Builds `bots.widget_settings.auto_pages` from the bot's already-discovered
 * pages (public.pages). For every page we emit one navigation entry; for every
 * in-page anchor (pages.anchors) we emit a deep-link entry. A single batched
 * LLM call generates short Vietnamese intent phrases for the whole list.
 *
 * The 20-page cap (MAX_ALLOWED_PAGES) has been removed — auto_pages is unbounded.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { EPageStatus } from "@/types";
import type { KeyActionPage } from "@/types";
import type { ServiceClient } from "@/lib/services/types";
import type { ExtractedAnchor } from "@/lib/helpers/crawl-website-helpers";
import { NAVIGATION_INTENT_SYSTEM_PROMPT } from "@/lib/ai/prompt";

/** Model used for the batched intent-generation call. */
const NAVIGATION_INTENT_MODEL =
  process.env.NAVIGATION_INTENT_MODEL || process.env.CHAT_MODEL || "gemini-3.1-flash-lite";

type NavCandidate = {
  path: string;
  title: string;
  intent: string;
  anchor: string | null;
};

/** Derive a human-readable title from a URL when the page has none. */
function deriveTitleFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const lastSegment = u.pathname.split("/").filter(Boolean).pop();
    const base = lastSegment ?? u.hostname;
    return base
      .replace(/[-_]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  } catch {
    return url;
  }
}

function normalizeTitleFallback(title: string): string {
  return title.toLowerCase().trim();
}

/**
 * Generate intent phrases for the candidate list using a single batched LLM call.
 * Falls back to normalized titles when the LLM is unavailable or output is unusable.
 */
async function generateIntents(candidates: NavCandidate[]): Promise<string[]> {
  const fallback = candidates.map((c) => normalizeTitleFallback(c.title));

  if (!process.env.GOOGLE_API_KEY) {
    console.warn("[NavigationAutobuild] GOOGLE_API_KEY missing — using title fallback for intents");
    return fallback;
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    const model = genAI.getGenerativeModel({
      model: NAVIGATION_INTENT_MODEL,
      systemInstruction: NAVIGATION_INTENT_SYSTEM_PROMPT,
    });

    const payload = candidates.map((c) => ({ path: c.path, title: c.title }));
    const result = await model.generateContent(JSON.stringify(payload));
    const raw = result.response.text().trim();

    const parsed = parseIntentArray(raw, candidates.length);
    if (!parsed) {
      console.warn("[NavigationAutobuild] LLM returned non-JSON intent list — using fallback");
      return fallback;
    }
    // Map each candidate to its generated intent, falling back to its title.
    return parsed.map((intent, i) => {
      const phrase = typeof intent === "string" ? intent.trim() : (intent?.intent?.trim() ?? "");
      return phrase.length > 0 ? phrase : fallback[i];
    });
  } catch (error) {
    console.error("[NavigationAutobuild] Intent LLM call failed — using fallback:", error);
    return fallback;
  }
}

/**
 * Parse the model output into an array of intent descriptors.
 * Accepts either an array of strings or an array of { intent } objects.
 * Returns null when the output is not a usable array.
 */
function parseIntentArray(
  raw: string,
  expectedLength: number
): Array<string | { intent: string }> | null {
  let text = raw;
  // Strip markdown code fences if present.
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) text = fenceMatch[1].trim();

  // Find the first '[' ... last ']' slice to be resilient to stray prose.
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) return null;

  try {
    const parsed = JSON.parse(text.slice(start, end + 1));
    if (!Array.isArray(parsed)) return null;
    if (parsed.length !== expectedLength) {
      // Allow partial — pad with fallbacks by returning a length-matched array.
      return parsed.slice(0, expectedLength);
    }
    return parsed as Array<string | { intent: string }>;
  } catch {
    return null;
  }
}

/**
 * Read all discovered (completed) pages for a bot, build navigation candidates
 * (one per page + one per in-page anchor), generate intent phrases in a single
 * batched LLM call, and persist the result into bots.widget_settings.auto_pages.
 *
 * Safe to call as a background job. Errors are logged and swallowed so they
 * never break the discover / appearance flow that triggered the build.
 */
export async function buildNavigationFromPages(
  supabase: ServiceClient,
  botId: string
): Promise<void> {
  try {
    console.log("[NavigationAutobuild] Building auto_pages for bot:", botId);

    const { data: pages, error } = await supabase
      .from("pages")
      .select("id, url, title, anchors")
      .eq("bot_id", botId)
      .in("status", [
        EPageStatus.Completed,
        EPageStatus.Pending,
        EPageStatus.PendingIndex,
        EPageStatus.Ignored,
      ]);

    if (error) {
      throw new Error(error.message);
    }

    const candidates: NavCandidate[] = [];
    for (const page of pages ?? []) {
      const pageTitle = page.title || deriveTitleFromUrl(page.url);
      candidates.push({ path: page.url, title: pageTitle, intent: "", anchor: null });
      console.log("[NavigationAutobuild] Candidate (page):", {
        path: page.url,
        title: pageTitle,
        anchor: null,
      });

      const anchors = (page.anchors as ExtractedAnchor[] | null | undefined) ?? [];
      for (const a of anchors) {
        if (!a?.id) continue;
        candidates.push({ path: page.url, title: a.text, intent: "", anchor: a.id });
        console.log("[NavigationAutobuild] Candidate (anchor):", {
          path: page.url,
          anchorId: a.id,
          title: a.text,
        });
      }
    }
    console.log(
      `[NavigationAutobuild] Total candidates: ${candidates.length} (from ${(pages ?? []).length} pages)`
    );

    const intents = await generateIntents(candidates);
    candidates.forEach((c, i) => {
      c.intent = intents[i] ?? normalizeTitleFallback(c.title);
      console.log("[NavigationAutobuild] Intent generated:", {
        path: c.path,
        anchor: c.anchor,
        title: c.title,
        intent: c.intent,
      });
    });

    const autoPages: KeyActionPage[] = candidates.map((c) => ({
      path: c.path,
      title: c.title,
      intent: c.intent,
      anchor: c.anchor,
    }));

    // Persist without clobbering other widget_settings keys (read-modify-write).
    const { data: bot, error: fetchError } = await supabase
      .from("bots")
      .select("widget_settings")
      .eq("id", botId)
      .single();

    if (fetchError) {
      throw new Error(fetchError.message);
    }

    const currentSettings = (bot?.widget_settings as Record<string, unknown> | null) ?? {};
    const merged: Record<string, unknown> = {
      ...currentSettings,
      auto_pages: autoPages,
    };

    const { error: updateError } = await supabase
      .from("bots")
      .update({ widget_settings: merged })
      .eq("id", botId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    console.log(`[NavigationAutobuild] Wrote ${autoPages.length} auto_pages for bot ${botId}`);
  } catch (error) {
    console.error("[NavigationAutobuild] Failed to build auto_pages for bot:", botId, error);
  }
}
