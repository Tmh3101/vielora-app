"use client";

import { create } from "zustand";
import { CrawlScope, BotDetailDashboardTabs } from "@/lib/constants";
import type { CrawlScopeType } from "@/types/scrape";

export interface UpgradeModalMessage {
  title?: string;
  description?: string;
}

export interface BotDetailUIState {
  activeTab: string;
  stopModalOpen: boolean;
  upgradeModalOpen: boolean;
  upgradeModalMessage: UpgradeModalMessage;
  reindexModalOpen: boolean;
  addDataSourceOpen: boolean;
  editKnowledgeOpen: boolean;
  deleteKnowledgeOpen: boolean;
  reindexScope: CrawlScopeType;
  hasStartedReindexDiscover: boolean;

  setActiveTab: (tab: string) => void;
  setStopModalOpen: (open: boolean) => void;
  setUpgradeModalOpen: (open: boolean) => void;
  setUpgradeModalMessage: (msg: UpgradeModalMessage) => void;
  setReindexModalOpen: (open: boolean) => void;
  setAddDataSourceOpen: (open: boolean) => void;
  setEditKnowledgeOpen: (open: boolean) => void;
  setDeleteKnowledgeOpen: (open: boolean) => void;
  setReindexScope: (scope: CrawlScopeType) => void;
  setHasStartedReindexDiscover: (started: boolean) => void;
}

export const useBotDetailUIStore = create<BotDetailUIState>()((set) => ({
  activeTab: BotDetailDashboardTabs.OVERVIEW,
  stopModalOpen: false,
  upgradeModalOpen: false,
  upgradeModalMessage: {},
  reindexModalOpen: false,
  addDataSourceOpen: false,
  editKnowledgeOpen: false,
  deleteKnowledgeOpen: false,
  reindexScope: CrawlScope.FULL_WEBSITE,
  hasStartedReindexDiscover: false,

  setActiveTab: (tab) => set({ activeTab: tab }),
  setStopModalOpen: (open) => set({ stopModalOpen: open }),
  setUpgradeModalOpen: (open) => set({ upgradeModalOpen: open }),
  setUpgradeModalMessage: (msg) => set({ upgradeModalMessage: msg }),
  setReindexModalOpen: (open) => set({ reindexModalOpen: open }),
  setAddDataSourceOpen: (open) => set({ addDataSourceOpen: open }),
  setEditKnowledgeOpen: (open) => set({ editKnowledgeOpen: open }),
  setDeleteKnowledgeOpen: (open) => set({ deleteKnowledgeOpen: open }),
  setReindexScope: (scope) => set({ reindexScope: scope }),
  setHasStartedReindexDiscover: (started) => set({ hasStartedReindexDiscover: started }),
}));
