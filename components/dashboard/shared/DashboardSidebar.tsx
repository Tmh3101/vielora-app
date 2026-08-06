"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  Book,
  CreditCard,
  Home,
  LogOut,
  HelpCircle,
  Users,
  User,
  MoreVertical,
} from "lucide-react";
import { WorkspaceSwitcher } from "@/components/dashboard/shared/WorkspaceSwitcher";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useWorkspace } from "@/hooks/useWorkspace";

export interface DashboardSidebarProps {
  fullName?: string;
  email?: string;
  currentPlanLabel?: string;
  onSignOut: () => Promise<void>;
}

export function DashboardSidebar({
  fullName,
  email,
  // currentPlanLabel,
  onSignOut,
}: DashboardSidebarProps) {
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
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length === 1) return "/";
    if (segments.length > 1) return `/${segments.slice(1).join("/")}`;
    return pathname;
  };

  const isPathActive = (key: "overview" | "knowledge" | "members" | "upgrade" | "support") => {
    if (key === "overview") {
      return getSubPath() === "/" || getSubPath() === "";
    }
    if (key === "knowledge") {
      return (
        getSubPath() === "/workspace-knowledge" || getSubPath().startsWith("/workspace-knowledge/")
      );
    }
    if (key === "members") {
      return getSubPath() === "/settings/members" || getSubPath().startsWith("/settings/members/");
    }
    if (key === "upgrade") {
      return (
        getSubPath() === "/upgrade" ||
        getSubPath().startsWith("/upgrade/") ||
        getSubPath() === "/checkout" ||
        getSubPath().startsWith("/checkout/") ||
        getSubPath() === "/credits" ||
        getSubPath().startsWith("/credits/") ||
        getSubPath() === "/payment" ||
        getSubPath().startsWith("/payment/")
      );
    }
    if (key === "support") {
      return getSubPath() === "/support" || getSubPath().startsWith("/support/");
    }
    return false;
  };

  const getLinkClass = (key: "overview" | "knowledge" | "members" | "upgrade" | "support") => {
    const isActive = isPathActive(key);
    return `flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs transition-all border ${
      isActive
        ? "border-primary/20 bg-primary/10 text-primary font-semibold"
        : "border-transparent text-muted-foreground hover:border-border/40 hover:bg-muted/30 hover:text-foreground font-medium"
    }`;
  };

  const overviewHref = activeWorkspace?.slug ? `/${activeWorkspace.slug}` : "/dashboard";
  const knowledgeHref = activeWorkspace?.slug
    ? `/${activeWorkspace.slug}/workspace-knowledge`
    : "/dashboard/workspace-knowledge";
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
    <aside className="fixed bottom-0 left-0 top-0 z-40 hidden w-64 flex-col border-r border-border/50 bg-card/50 backdrop-blur-sm lg:flex">
      <div className="flex items-center gap-3 border-b border-border/50 p-6">
        <Link
          href="/"
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/50 transition-colors hover:bg-muted"
          title="Về trang chủ"
        >
          <ArrowLeft className="h-4 w-4 text-muted-foreground" />
        </Link>
        <Link href={overviewHref} className="group flex items-center">
          <Image
            src="/images/logo-full.png"
            alt="Vielora"
            width={200}
            height={64}
            className="h-16 w-auto px-1"
            priority
          />
        </Link>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        <Link href={overviewHref} className={getLinkClass("overview")}>
          <Home className="h-4 w-4" />
          Tổng quan
        </Link>
        <Link href={knowledgeHref} className={getLinkClass("knowledge")}>
          <Book className="h-4 w-4" />
          Kiến thức chung
        </Link>
        <Link href={membersHref} className={getLinkClass("members")}>
          <Users className="h-4 w-4" />
          Thành viên
        </Link>
        <Link href={upgradeHref} className={getLinkClass("upgrade")}>
          <CreditCard className="h-4 w-4" />
          Thanh toán
        </Link>
        <Link href={supportHref} className={getLinkClass("support")}>
          <HelpCircle className="h-4 w-4" />
          Hỗ trợ
        </Link>
      </nav>

      <div className="space-y-2.5 border-t border-border/50 p-4">
        <div>
          <p className="mb-1.5 px-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Workspace
          </p>
          <WorkspaceSwitcher />
        </div>

        <div className="flex items-center justify-between gap-2 rounded-xl border border-border/40 bg-muted/30 p-2">
          <div className="flex min-w-0 items-center gap-3">
            <div className="bg-gradient-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-primary-foreground">
              <User className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-foreground">{fullName}</p>
              <p className="truncate text-[11px] text-muted-foreground">{email}</p>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-muted-foreground hover:bg-muted hover:text-foreground"
                title="Tùy chọn tài khoản"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-40 rounded-xl border-border/60 p-1 shadow-lg"
            >
              <DropdownMenuItem
                onClick={() => void onSignOut()}
                className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-destructive hover:bg-destructive/10 focus:bg-destructive/10 focus:text-destructive"
              >
                <LogOut className="h-3.5 w-3.5" />
                Đăng xuất
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </aside>
  );
}
