"use client";

import { create } from "zustand";

export interface DashboardUIState {
  limitDialogOpen: boolean;
  botSelectorOpen: boolean;
  setLimitDialogOpen: (open: boolean) => void;
  setBotSelectorOpen: (open: boolean) => void;
}

export const useDashboardUIStore = create<DashboardUIState>()((set) => ({
  limitDialogOpen: false,
  botSelectorOpen: false,
  setLimitDialogOpen: (open) => set({ limitDialogOpen: open }),
  setBotSelectorOpen: (open) => set({ botSelectorOpen: open }),
}));
