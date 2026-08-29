"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWorkspace } from "@/hooks/useWorkspace";
import { Loader2 } from "lucide-react";

export default function WorkspaceTemplatesSettingsPage() {
  const router = useRouter();
  const { activeWorkspace } = useWorkspace();

  useEffect(() => {
    const target = activeWorkspace?.slug
      ? `/${activeWorkspace.slug}/reports?tab=templates`
      : "/dashboard/reports?tab=templates";
    router.replace(target);
  }, [activeWorkspace?.slug, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground">
          Đang chuyển hướng sang Mẫu báo cáo...
        </p>
      </div>
    </div>
  );
}
