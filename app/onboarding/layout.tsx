"use client";

import { WorkspaceProvider } from "@/hooks/useWorkspace";

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return <WorkspaceProvider>{children}</WorkspaceProvider>;
}
