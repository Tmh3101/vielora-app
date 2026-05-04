import { create } from "zustand";

export interface OnboardingState {
  step: number;
  botId: string | null;
  setStep: (step: number) => void;
  setBotId: (id: string) => void;
  reset: () => void;
}

const INITIAL_STEP = 1;

export const useOnboardingStore = create<OnboardingState>((set) => ({
  step: INITIAL_STEP,
  botId: null,
  setStep: (step) => set({ step }),
  setBotId: (id) => set({ botId: id }),
  reset: () => set({ step: INITIAL_STEP, botId: null }),
}));
