"use client";

import { AIConfigurator } from "@/components/shared/AIConfigurator";

interface AIConfigTabProps {
  botId: string;
  currentPlan: string;
  initialPersonalityId: string | null;
  initialSkillIds: string[];
  onSaved?: () => void;
}

export function AIConfigTab(props: AIConfigTabProps) {
  return <AIConfigurator {...props} />;
}
