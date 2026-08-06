"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditCard, HelpCircle, Home, Users } from "lucide-react";
import { useWorkspace } from "@/hooks/useWorkspace";

export function DashboardMobileNav() {
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
  const isMembersActive =
    subPath === "/settings/members" || subPath.startsWith("/settings/members/");
  const isUpgradeActive = subPath === "/upgrade" || subPath.startsWith("/upgrade/");
  const isSupportActive = subPath === "/support" || subPath.startsWith("/support/");

  const overviewHref = activeWorkspace?.slug ? `/${activeWorkspace.slug}` : "/dashboard";
  const membersHref = activeWorkspace?.slug
    ? `/${activeWorkspace.slug}/settings/members`
    : "/dashboard/settings/members";
  const upgradeHref = activeWorkspace?.slug
    ? `/${activeWorkspace.slug}/upgrade`
    : "/dashboard/upgrade";
  const supportHref = activeWorkspace?.slug
    ? `/${activeWorkspace.slug}/support`
    : "/dashboard/support";

  return (
    <div className="fixed bottom-6 left-6 right-6 z-50 lg:hidden">
      <nav className="flex items-center justify-around rounded-2xl border border-white/10 bg-background/80 px-3 py-2 shadow-lg backdrop-blur-xl">
        <Link
          href={overviewHref}
          className={`flex flex-col items-center gap-1 rounded-xl p-2 transition-colors ${
            isOverviewActive
              ? "font-semibold text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
          aria-label="Tổng quan"
        >
          <Home className="h-5 w-5" />
        </Link>
        <Link
          href={membersHref}
          className={`flex flex-col items-center gap-1 rounded-xl p-2 transition-colors ${
            isMembersActive
              ? "font-semibold text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
          aria-label="Thành viên"
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
          aria-label="Thanh toán"
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
          aria-label="Hỗ trợ"
        >
          <HelpCircle className="h-5 w-5" />
        </Link>
      </nav>
    </div>
  );
}
