import { NEGATIVE_KEYWORDS, SOCIAL_KEYWORDS } from "@/config";

export type IntentType = "social" | "knowledge";

export const Intent = {
  Social: "social",
  Knowledge: "knowledge",
} as const;

function removeVietnameseTones(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

const SOCIAL_KEYWORDS_NORMALIZED = SOCIAL_KEYWORDS.map((k) =>
  removeVietnameseTones(k.toLowerCase())
);

const NEGATIVE_KEYWORDS_NORMALIZED = NEGATIVE_KEYWORDS.map((k) =>
  removeVietnameseTones(k.toLowerCase())
);

function levenshteinDistance(a: string, b: string): number {
  const alen = a.length;
  const blen = b.length;

  if (Math.abs(alen - blen) > 2) return Math.max(alen, blen);

  if (alen === 0) return blen;
  if (blen === 0) return alen;

  let prev = new Array(blen + 1);
  let curr = new Array(blen + 1);

  for (let j = 0; j <= blen; j++) prev[j] = j;

  for (let i = 1; i <= alen; i++) {
    curr[0] = i;
    for (let j = 1; j <= blen; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }

  return prev[blen];
}

export type IntentContext = {
  chatHistoryLength?: number;
  isWaitingForLeadForm?: boolean;
};

export function classifyIntent(message: string, context?: IntentContext): IntentType {
  const normalized = removeVietnameseTones(message)
    .toLowerCase()
    .trim()
    .replace(/[.,!?;:-]/g, "")
    .replace(/\s+/g, " ");

  if (!normalized) return Intent.Knowledge;

  if (
    context?.isWaitingForLeadForm &&
    (normalized === "khong" ||
      normalized === "ko" ||
      normalized === "no" ||
      normalized === "khong a")
  ) {
    return Intent.Social;
  }

  const containsNegative = NEGATIVE_KEYWORDS_NORMALIZED.some((keyword) => {
    const regex = new RegExp(`\\b${keyword}\\b`);
    return regex.test(normalized);
  });
  if (containsNegative) return Intent.Knowledge;

  const wordCount = normalized.split(" ").length;
  if (normalized.length > 40 || wordCount > 7) {
    return Intent.Knowledge;
  }

  if (context?.chatHistoryLength === 0 && normalized.length <= 3) {
    return Intent.Knowledge;
  }

  const isSocial = SOCIAL_KEYWORDS_NORMALIZED.some((keyword) => {
    if (keyword.length <= 3) {
      if (normalized === keyword) return true;
    } else {
      if (normalized === keyword || normalized.startsWith(keyword + " ")) {
        return true;
      }
    }

    const kmaxDist = keyword.length > 7 ? 2 : keyword.length > 4 ? 1 : 0;
    if (kmaxDist > 0) {
      const prefixToCompare = normalized.slice(0, keyword.length + kmaxDist).trim();

      if (levenshteinDistance(prefixToCompare, keyword) <= kmaxDist) {
        return true;
      }

      if (levenshteinDistance(normalized, keyword) <= kmaxDist) {
        return true;
      }
    }

    return false;
  });

  return isSocial ? Intent.Social : Intent.Knowledge;
}
