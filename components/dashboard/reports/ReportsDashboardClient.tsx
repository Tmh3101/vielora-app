"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { DashboardSidebar } from "@/components/dashboard/shared/DashboardSidebar";
import { DashboardMobileHeader } from "@/components/dashboard/shared/DashboardMobileHeader";
import { DashboardMobileNav } from "@/components/dashboard/shared/DashboardMobileNav";
import { PageHeader } from "@/components/dashboard/shared/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Loader2, FileBarChart, LayoutTemplate, Palette, Crown } from "lucide-react";
import { ReportExportList } from "./ReportExportList";
import { TemplateEditorTab } from "@/components/dashboard/workspace-settings/TemplateEditorTab";
import { BrandingTab } from "@/components/dashboard/workspace-settings/BrandingTab";
import { EWorkspaceRole } from "@/types/enums";

export type ReportDashboardTab = "exports" | "templates" | "branding";

export interface ReportsDashboardClientProps {
  initialWorkspaceId?: string;
}

export function ReportsDashboardClient({ initialWorkspaceId }: ReportsDashboardClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const { signOut } = useAuth();
  const { activeWorkspace, isLoading: workspaceLoading } = useWorkspace();

  const currentPlanCode = activeWorkspace?.plans?.code?.toLowerCase() || "free";
  const isProOrEnterprise = currentPlanCode === "pro" || currentPlanCode === "enterprise";

  const rawTab = searchParams.get("tab");
  const activeTab: ReportDashboardTab =
    rawTab === "templates" ? "templates" : rawTab === "branding" ? "branding" : "exports";

  const workspaceId = activeWorkspace?.id ?? initialWorkspaceId;

  const isOwnerOrAdmin = useMemo(() => {
    const role = activeWorkspace?.role?.toLowerCase();
    return role === EWorkspaceRole.Owner || role === EWorkspaceRole.Admin;
  }, [activeWorkspace?.role]);

  const handleTabChange = (tab: ReportDashboardTab) => {
    const basePath = activeWorkspace?.slug
      ? `/${activeWorkspace.slug}/reports`
      : "/dashboard/reports";
    const targetUrl = tab === "exports" ? basePath : `${basePath}?tab=${tab}`;
    router.replace(targetUrl, { scroll: false });
  };

  const getHeaderInfo = () => {
    switch (activeTab) {
      case "templates":
        return {
          title: "Mẫu báo cáo",
          description: (
            <>
              Tùy biến cấu trúc và các phần trong mẫu báo cáo xuất PDF cho không gian làm việc{" "}
              <span className="font-semibold text-foreground">
                {activeWorkspace?.name || "workspace"}
              </span>
            </>
          ),
        };
      case "branding":
        return {
          title: "Nhận diện thương hiệu",
          description: (
            <>
              Tùy chỉnh thông tin thương hiệu, logo và giao diện báo cáo cho không gian làm việc{" "}
              <span className="font-semibold text-foreground">
                {activeWorkspace?.name || "workspace"}
              </span>
            </>
          ),
        };
      case "exports":
      default:
        return {
          title: "Báo cáo",
          description: (
            <>
              Quản lý danh sách, xem trước và phê duyệt báo cáo PDF của không gian làm việc{" "}
              <span className="font-semibold text-foreground">
                {activeWorkspace?.name || "workspace"}
              </span>
            </>
          ),
        };
    }
  };

  const { title, description } = getHeaderInfo();

  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar
        fullName={user?.user_metadata?.full_name}
        email={user?.email}
        onSignOut={signOut}
      />

      <DashboardMobileHeader
        fullName={user?.user_metadata?.full_name}
        email={user?.email}
        onNavigateSettings={() => router.push("/dashboard/settings/members")}
        onSignOut={signOut}
      />

      <main className="lg:pl-64">
        <div className="container mx-auto space-y-6 px-4 pb-24 pt-8 sm:px-6 lg:px-8">
          {/* Header Banner */}
          <PageHeader title={title} description={description}>
            {!workspaceId && (
              <Button variant="outline" onClick={() => router.push("/dashboard")}>
                Chọn workspace
              </Button>
            )}
          </PageHeader>

          {/* Sub-Navigation Tabs */}
          <div className="flex border-b border-border/50">
            <nav className="-mb-px flex space-x-6" aria-label="Reports Navigation">
              <button
                type="button"
                onClick={() => handleTabChange("exports")}
                className={`flex items-center gap-2 border-b-2 py-3 text-xs font-semibold transition-colors ${
                  activeTab === "exports"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
                }`}
              >
                <FileBarChart className="h-4 w-4" />
                Danh sách báo cáo
              </button>
              <button
                type="button"
                onClick={() => handleTabChange("templates")}
                className={`flex items-center gap-2 border-b-2 py-3 text-xs font-semibold transition-colors ${
                  activeTab === "templates"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
                }`}
              >
                <LayoutTemplate className="h-4 w-4" />
                Mẫu báo cáo
              </button>
              <button
                type="button"
                onClick={() => handleTabChange("branding")}
                className={`flex items-center gap-2 border-b-2 py-3 text-xs font-semibold transition-colors ${
                  activeTab === "branding"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
                }`}
              >
                <Palette className="h-4 w-4" />
                Thương hiệu
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          {workspaceLoading ? (
            <Card className="border border-border/50 bg-card/50 p-12 text-center shadow-md backdrop-blur-sm">
              <div className="flex flex-col items-center justify-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm font-medium text-muted-foreground">Đang tải workspace...</p>
              </div>
            </Card>
          ) : !workspaceId ? (
            <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/60 bg-muted/20 p-8 text-center">
              <Building2 className="h-10 w-10 text-muted-foreground opacity-50" />
              <div className="space-y-1">
                <p className="font-semibold text-foreground">Chưa chọn Workspace</p>
                <p className="text-xs text-muted-foreground">
                  Vui lòng chọn không gian làm việc để quản lý và xem danh sách báo cáo PDF.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/dashboard")}
                className="mt-2 rounded-xl text-xs"
              >
                Về trang tổng quan
              </Button>
            </div>
          ) : !isProOrEnterprise ? (
            <Card className="border border-amber-500/30 bg-gradient-to-b from-amber-500/10 via-card to-card p-12 text-center shadow-md backdrop-blur-sm">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
                <Crown className="h-8 w-8" />
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <h3 className="text-base font-bold text-foreground">
                    Tính năng dành riêng cho gói Pro và Enterprise
                  </h3>
                  <span className="rounded-md border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 text-xs font-bold text-amber-700 dark:text-amber-300">
                    PRO
                  </span>
                </div>
                <p className="mx-auto max-w-md text-xs text-muted-foreground">
                  Không gian làm việc của bạn hiện đang ở gói{" "}
                  {activeWorkspace?.plans?.name || "miễn phí"}. Vui lòng nâng cấp lên gói Pro hoặc
                  Enterprise để quản lý, cấu hình mẫu và xuất báo cáo PDF.
                </p>
                <div className="pt-4">
                  <Button
                    asChild
                    className="shadow-xs rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-6 text-xs font-semibold text-white transition-all hover:opacity-90 active:scale-95"
                  >
                    <a
                      href={`/${encodeURIComponent(activeWorkspace?.slug || "")}/dashboard/settings/billing`}
                    >
                      <Crown className="mr-1.5 h-4 w-4" />
                      Nâng cấp gói ngay
                    </a>
                  </Button>
                </div>
              </div>
            </Card>
          ) : activeTab === "exports" ? (
            <ReportExportList workspaceId={workspaceId} />
          ) : activeTab === "templates" ? (
            <TemplateEditorTab workspaceId={workspaceId} isOwnerOrAdmin={isOwnerOrAdmin} />
          ) : (
            <BrandingTab workspaceId={workspaceId} isOwnerOrAdmin={isOwnerOrAdmin} />
          )}
        </div>
      </main>

      <DashboardMobileNav />
    </div>
  );
}
