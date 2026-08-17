"use client";

import { GroupManagement } from "@/components/dashboard/group/GroupManagement";
import type { Tables } from "@/lib/supabase/types";

interface GroupTabProps {
  bot: Tables<"bots">;
  onNavigateToSettings?: () => void;
}

export function GroupTab({ bot, onNavigateToSettings }: GroupTabProps) {
  return (
    <div className="space-y-6">
      <GroupManagement bot={bot} onNavigateToSettings={onNavigateToSettings} />
    </div>
  );
}
