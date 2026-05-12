import { create } from "zustand";
import type { CrawlScopeType } from "@/types/scrape";
import { CrawlScope } from "@/lib/constants";

export interface OnboardingState {
  step: number;
  botId: string | null;
  crawlScope: CrawlScopeType;
  setStep: (step: number) => void;
  setBotId: (id: string) => void;
  setCrawlScope: (scope: CrawlScopeType) => void;
  reset: () => void;
}

const INITIAL_STEP = 1;
const DEFAULT_CRAWL_SCOPE: CrawlScopeType = CrawlScope.FULL_WEBSITE;

export const useOnboardingStore = create<OnboardingState>((set) => ({
  step: INITIAL_STEP,
  botId: null,
  crawlScope: DEFAULT_CRAWL_SCOPE,
  setStep: (step) => set({ step }),
  setBotId: (id) => set({ botId: id }),
  setCrawlScope: (crawlScope) => set({ crawlScope }),
  reset: () => set({ step: INITIAL_STEP, botId: null, crawlScope: DEFAULT_CRAWL_SCOPE }),
}));
