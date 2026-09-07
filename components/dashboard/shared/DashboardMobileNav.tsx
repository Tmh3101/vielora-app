"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Book, CreditCard, FileBarChart, HelpCircle, Home, Users } from "lucide-react";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useTranslations } from "next-intl";

export function DashboardMobileNav() {
  const t = useTranslations("dashboard.shared.mobileNav");
  const pathname = usePathname();
  const { activeWorkspace } = useWorkspace();

  const getSubPath = () => {
    if (!pathname) return "/";
    if (activeWorkspace?.slug && pathname.startsWith(`/${activeWorkspace.slug}`)) {
      return pathname.slice(activeWorkspace.slug.length + 1) || "/";
    }
    if (pathname.startsWith("/dashboard")) {
      return pathname.slice("/dashboard".length) || "/";
    }
    return pathname;
  };

  const subPath = getSubPath();

  const isOverviewActive = subPath === "/" || subPath === "";
  const isKnowledgeActive =
    subPath === "/workspace-knowledge" || subPath.startsWith("/workspace-knowledge/");
  const isReportsActive = subPath === "/reports" || subPath.startsWith("/reports/");
  const isMembersActive =
    subPath === "/settings/members" || subPath.startsWith("/settings/members/");
  const isUpgradeActive = subPath === "/upgrade" || subPath.startsWith("/upgrade/");
  const isSupportActive = subPath === "/support" || subPath.startsWith("/support/");

  const overviewHref = activeWorkspace?.slug ? `/${activeWorkspace.slug}` : "/dashboard";
  const knowledgeHref = activeWorkspace?.slug
    ? `/${activeWorkspace.slug}/workspace-knowledge`
    : "/dashboard/workspace-knowledge";
  const reportsHref = activeWorkspace?.slug
    ? `/${activeWorkspace.slug}/reports`
    : "/dashboard/reports";
  const membersHref = activeWorkspace?.slug
    ? `/${activeWorkspace.slug}/settings/members`
    : "/dashboard/settings/members";
  const upgradeHref = activeWorkspace?.slug
    ? `/${activeWorkspace.slug}/upgrade`
    : "/dashboard/upgrade";
  const supportHref = activeWorkspace?.slug
    ? `/${activeWorkspace.slug}/support`
    : "/dashboard/support";

  const currentPlanCode = activeWorkspace?.plans?.code?.toLowerCase() || "free";
  const isProOrEnterprise = currentPlanCode === "pro" || currentPlanCode === "enterprise";

  return (
    <div className="fixed bottom-6 left-6 right-6 z-50 lg:hidden">
      <nav className="flex items-center justify-around rounded-2xl border border-white/10 bg-background/80 px-2 py-2 shadow-lg backdrop-blur-xl">
        <Link
          href={overviewHref}
          className={`flex flex-col items-center gap-1 rounded-xl p-2 transition-colors ${
            isOverviewActive
              ? "font-semibold text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
          aria-label={t("overview")}
        >
          <Home className="h-5 w-5" />
        </Link>
        <Link
          href={knowledgeHref}
          className={`flex flex-col items-center gap-1 rounded-xl p-2 transition-colors ${
            isKnowledgeActive
              ? "font-semibold text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
          aria-label={t("knowledge")}
        >
          <Book className="h-5 w-5" />
        </Link>
        {isProOrEnterprise && (
          <Link
            href={reportsHref}
            className={`flex flex-col items-center gap-1 rounded-xl p-2 transition-colors ${
              isReportsActive
                ? "font-semibold text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
            aria-label={t("reports")}
          >
            <FileBarChart className="h-5 w-5" />
          </Link>
        )}
        <Link
          href={membersHref}
          className={`flex flex-col items-center gap-1 rounded-xl p-2 transition-colors ${
            isMembersActive
              ? "font-semibold text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
          aria-label={t("members")}
        >
          <Users className="h-5 w-5" />
        </Link>
        <Link
          href={upgradeHref}
          className={`flex flex-col items-center gap-1 rounded-xl p-2 transition-colors ${
            isUpgradeActive
              ? "font-semibold text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
          aria-label={t("upgrade")}
        >
          <CreditCard className="h-5 w-5" />
        </Link>
        <Link
          href={supportHref}
          className={`flex flex-col items-center gap-1 rounded-xl p-2 transition-colors ${
            isSupportActive
              ? "font-semibold text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
          aria-label={t("support")}
        >
          <HelpCircle className="h-5 w-5" />
        </Link>
      </nav>
    </div>
  );
}
