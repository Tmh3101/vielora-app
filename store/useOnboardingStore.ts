import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { CrawlScopeType } from "@/types/scrape";
import type { OnboardingSourceMode } from "@/lib/constants";
import { ONBOARDING_SOURCE_MODE } from "@/lib/constants";
import { CrawlScope } from "@/lib/constants";

export interface OnboardingState {
  step: number;
  botId: string | null;
  crawlScope: CrawlScopeType;
  sourceMode: OnboardingSourceMode;
  hasHydrated: boolean;
  setStep: (step: number) => void;
  setBotId: (id: string | null) => void;
  setCrawlScope: (scope: CrawlScopeType) => void;
  setSourceMode: (mode: OnboardingSourceMode) => void;
  setHasHydrated: (hasHydrated: boolean) => void;
  reset: () => void;
}

const INITIAL_STEP = 1;
const DEFAULT_CRAWL_SCOPE: CrawlScopeType = CrawlScope.FULL_WEBSITE;
const DEFAULT_SOURCE_MODE: OnboardingSourceMode = ONBOARDING_SOURCE_MODE.WEBSITE;

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      step: INITIAL_STEP,
      botId: null,
      crawlScope: DEFAULT_CRAWL_SCOPE,
      sourceMode: DEFAULT_SOURCE_MODE,
      hasHydrated: false,
      setStep: (step) => set({ step }),
      setBotId: (id) => set({ botId: id }),
      setCrawlScope: (crawlScope) => set({ crawlScope }),
      setSourceMode: (sourceMode) => set({ sourceMode }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
      reset: () =>
        set({
          step: INITIAL_STEP,
          botId: null,
          crawlScope: DEFAULT_CRAWL_SCOPE,
          sourceMode: DEFAULT_SOURCE_MODE,
        }),
    }),
    {
      name: "vielora-onboarding",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        step: state.step,
        botId: state.botId,
        crawlScope: state.crawlScope,
        sourceMode: state.sourceMode,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
