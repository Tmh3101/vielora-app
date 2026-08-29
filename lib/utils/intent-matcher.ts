import type { KeyActionPage } from "@/types";

export type IntentMatchResult = {
  /** Resolved URL — page.path (anchor optional, concatenated) */
  url: string;
  /** Optional anchor ID (without "#") */
  anchor?: string | null;
  /** True when the intent matched the page's `intent` field verbatim (explicit).
   *  False when matched via title fuzzy / heuristic (implicit). */
  explicit: boolean;
  /** The original page entry that was matched */
  page: KeyActionPage;
};

export type IntentMatchOptions = {
  /** Minimum similarity score for fuzzy title match (0..1). Default 0.7 */
  fuzzyThreshold?: number;
  /** If true, also try fuzzy match on the `intent` field. Default false. */
  fuzzyIntent?: boolean;
};

/** Default minimum similarity threshold for fuzzy matching */
export const MAX_FUZZY_SCORE = 0.7;

/**
 * Compute a normalized similarity score between two strings using
 * Levenshtein distance.
 *
 * Returns a value in [0, 1] where 1 means the strings are identical
 * and 0 means they share no common structure.
 *
 * Uses the classic DP approach with O(min(m,n)) space.
 */
export function similarity(a: string, b: string): number {
  const la = a.length;
  const lb = b.length;
  const maxLen = Math.max(la, lb);

  // Edge cases
  if (maxLen === 0) return 1; // both empty
  if (la === 0 || lb === 0) return 0;

  // Ensure we iterate over the shorter string in the inner loop
  // to use O(min(m,n)) space.
  const s = la <= lb ? a : b;
  const t = la <= lb ? b : a;
  const sLen = s.length;
  const tLen = t.length;

  // Previous and current rows of the DP matrix
  let prev = new Array<number>(sLen + 1);
  let curr = new Array<number>(sLen + 1);

  // Base case: distance from empty string
  for (let j = 0; j <= sLen; j++) {
    prev[j] = j;
  }

  for (let i = 1; i <= tLen; i++) {
    curr[0] = i;
    for (let j = 1; j <= sLen; j++) {
      const cost = t[i - 1] === s[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1, // deletion
        curr[j - 1] + 1, // insertion
        prev[j - 1] + cost // substitution
      );
    }
    // Swap rows
    [prev, curr] = [curr, prev];
  }

  const distance = prev[sLen];
  // Normalize: 1 - distance/maxLen, clamped to [0, 1]
  return Math.max(0, Math.min(1, 1 - distance / maxLen));
}

/**
 * Match a user message against a bot's Key Action Page whitelist.
 *
 * Matching strategy (in order):
 *   1. EXPLICIT: if userMessage (lowercased, trimmed) contains page.intent
 *      (lowercased) as a SUBSTRING → return { explicit: true }.
 *   2. IMPLICIT: if userMessage contains page.title (lowercased) as a
 *      substring → return { explicit: false }.
 *   3. If `fuzzyIntent === true`, run a Levenshtein-like normalized similarity
 *      between userMessage and page.intent / page.title; if score >= threshold,
 *      treat as implicit match.
 *   4. No match → return null.
 *
 * When multiple pages match, prefer explicit over implicit. Within the same
 * tier, return the FIRST match in the array order (admin's listed priority).
 *
 * Returns null if allowedPages is empty or all entries have empty
 * intent/title fields.
 */
export function matchKeyAction(
  userMessage: string,
  allowedPages: KeyActionPage[],
  options?: IntentMatchOptions
): IntentMatchResult | null {
  if (!allowedPages || allowedPages.length === 0) {
    return null;
  }

  const threshold = options?.fuzzyThreshold ?? MAX_FUZZY_SCORE;
  const fuzzyIntent = options?.fuzzyIntent ?? false;

  const messageLower = userMessage.toLowerCase().trim();

  if (messageLower.length === 0) {
    return null;
  }

  let explicitMatch: IntentMatchResult | null = null;
  let implicitMatch: IntentMatchResult | null = null;

  for (const page of allowedPages) {
    const intentLower = (page.intent ?? "").toLowerCase().trim();
    const titleLower = (page.title ?? "").toLowerCase().trim();

    // Skip entries with both empty intent AND empty title
    if (intentLower.length === 0 && titleLower.length === 0) {
      continue;
    }

    const buildResult = (explicit: boolean): IntentMatchResult => ({
      url: page.anchor ? `${page.path}#${page.anchor}` : page.path,
      anchor: page.anchor ?? null,
      explicit,
      page,
    });

    // 1. EXPLICIT: intent substring match (first wins)
    if (!explicitMatch && intentLower.length > 0 && messageLower.includes(intentLower)) {
      explicitMatch = buildResult(true);
      // Explicit is the highest priority — we can short-circuit if we
      // already have one. No need to keep looking for more explicit matches.
      break;
    }

    // 2. IMPLICIT: title substring match (first wins)
    if (!implicitMatch && titleLower.length > 0 && messageLower.includes(titleLower)) {
      implicitMatch = buildResult(false);
      // Don't break — keep looking for an explicit match which takes priority
    }
  }

  // If we already have an explicit match, return it
  if (explicitMatch) {
    return explicitMatch;
  }

  // If we have an implicit substring match, return it
  if (implicitMatch) {
    return implicitMatch;
  }

  // 3. Fuzzy matching (only when fuzzyIntent is enabled)
  if (fuzzyIntent) {
    let bestScore = 0;
    let bestMatch: IntentMatchResult | null = null;

    for (const page of allowedPages) {
      const intentLower = (page.intent ?? "").toLowerCase().trim();
      const titleLower = (page.title ?? "").toLowerCase().trim();

      // Skip entries with both empty intent AND empty title
      if (intentLower.length === 0 && titleLower.length === 0) {
        continue;
      }

      const buildResult = (): IntentMatchResult => ({
        url: page.anchor ? `${page.path}#${page.anchor}` : page.path,
        anchor: page.anchor ?? null,
        explicit: false,
        page,
      });

      // Fuzzy match on intent field
      if (intentLower.length > 0) {
        const score = similarity(messageLower, intentLower);
        if (score >= threshold && score > bestScore) {
          bestScore = score;
          bestMatch = buildResult();
        }
      }

      // Fuzzy match on title field
      if (titleLower.length > 0) {
        const score = similarity(messageLower, titleLower);
        if (score >= threshold && score > bestScore) {
          bestScore = score;
          bestMatch = buildResult();
        }
      }
    }

    return bestMatch;
  }

  // 4. No match
  return null;
}
