"use client";

import { create } from "zustand";
import { MAX_SKILLS_PER_BOT } from "@/lib/config/ai-customization";

export interface PersonalityOption {
  id: string;
  name: string;
  description: string | null;
  prompt_injection: string;
}

export interface SkillOption {
  id: string;
  name: string;
  description: string | null;
  prompt_injection: string;
}

export interface AIConfigState {
  selectedPersonalityId: string | null;
  selectedSkillIds: string[];
  isSaving: boolean;
  isLoading: boolean;
  personalityOptions: PersonalityOption[];
  skillOptions: SkillOption[];

  setSelectedPersonalityId: (id: string | null) => void;
  setSelectedSkillIds: (ids: string[]) => void;
  toggleSkill: (id: string) => void;
  setIsSaving: (value: boolean) => void;
  setIsLoading: (value: boolean) => void;
  setPersonalityOptions: (options: PersonalityOption[]) => void;
  setSkillOptions: (options: SkillOption[]) => void;
  initializeFromBot: (personalityId: string | null, skillIds: string[]) => void;
}

export const useAIConfigStore = create<AIConfigState>()((set) => ({
  selectedPersonalityId: null,
  selectedSkillIds: [],
  isSaving: false,
  isLoading: false,
  personalityOptions: [],
  skillOptions: [],

  setSelectedPersonalityId: (id) => set({ selectedPersonalityId: id }),
  setSelectedSkillIds: (ids) => set({ selectedSkillIds: ids }),
  toggleSkill: (id) =>
    set((state) => ({
      selectedSkillIds: state.selectedSkillIds.includes(id)
        ? state.selectedSkillIds.filter((s) => s !== id)
        : state.selectedSkillIds.length >= MAX_SKILLS_PER_BOT
          ? state.selectedSkillIds
          : [...state.selectedSkillIds, id],
    })),
  setIsSaving: (value) => set({ isSaving: value }),
  setIsLoading: (value) => set({ isLoading: value }),
  setPersonalityOptions: (options) => set({ personalityOptions: options }),
  setSkillOptions: (options) => set({ skillOptions: options }),
  initializeFromBot: (personalityId, skillIds) =>
    set({
      selectedPersonalityId: personalityId,
      selectedSkillIds: skillIds,
    }),
}));
