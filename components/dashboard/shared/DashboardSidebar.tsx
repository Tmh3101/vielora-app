"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CreditCard, Home, LogOut } from "lucide-react";
// import { Settings } from "lucide-react";

export interface DashboardSidebarProps {
  fullName?: string;
  email?: string;
  currentPlanLabel: string;
  onSignOut: () => Promise<void>;
}

export function DashboardSidebar({
  fullName,
  email,
  currentPlanLabel,
  onSignOut,
}: DashboardSidebarProps) {
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
        <Link href="/dashboard" className="group flex items-center">
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
        <Link
          href="/dashboard"
          className="flex items-center gap-3 rounded-xl bg-primary/10 px-4 py-2.5 font-medium text-primary"
        >
          <Home className="h-5 w-5" />
          Tổng quan
        </Link>
        <Link
          href="/dashboard/upgrade"
          className="flex items-center gap-3 rounded-xl px-4 py-2.5 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
        >
          <CreditCard className="h-5 w-5" />
          Nâng cấp
        </Link>
        {/* <Link
          href="/dashboard/settings"
          className="flex items-center gap-3 rounded-xl px-4 py-2.5 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
        >
          <Settings className="h-5 w-5" />
          Cài đặt
        </Link> */}
      </nav>

      <div className="space-y-3 border-t border-border/50 px-2 py-4">
        <div className="flex items-center gap-3 p-2">
          <div className="bg-gradient-primary flex h-9 w-9 items-center justify-center rounded-xl">
            <span className="text-sm font-medium text-primary-foreground">
              {fullName?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{fullName}</p>
            <p className="truncate text-xs">{email}</p>
            <p className="text-xs capitalize text-muted-foreground">Gói {currentPlanLabel}</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void onSignOut()}
          className="w-full justify-start text-muted-foreground hover:border-destructive/50 hover:bg-destructive/5 hover:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Đăng xuất
        </Button>
      </div>
    </aside>
  );
}
