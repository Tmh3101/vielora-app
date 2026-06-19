"use client";

import { AIConfigurator } from "@/components/shared/AIConfigurator";

interface AIConfigTabProps {
  botId: string;
  currentPlan: string;
  initialPersonalityId: string | null;
  initialSkillIds: string[];
}

export function AIConfigTab(props: AIConfigTabProps) {
  return <AIConfigurator {...props} />;
}
