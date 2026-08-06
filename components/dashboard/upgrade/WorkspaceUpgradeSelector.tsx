"use client";

import Link from "next/link";
import { Check, ChevronDown, PlusCircle, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface WorkspaceSelectorItem {
  id: string;
  name: string;
  slug: string;
  planName?: string;
  planCode?: string;
}

interface WorkspaceUpgradeSelectorProps {
  workspaces: WorkspaceSelectorItem[];
  selectedSlug: string | null;
  onSelectWorkspace: (slug: string, id: string) => void;
  title?: string;
}

function setWorkspaceCookie(wsId: string) {
  if (typeof document !== "undefined") {
    document.cookie = `active_workspace_id=${wsId}; path=/; max-age=2592000; SameSite=Lax`;
  }
}

export function WorkspaceUpgradeSelector({
  workspaces = [],
  selectedSlug,
  onSelectWorkspace,
  title = "Workspace hiện tại",
}: WorkspaceUpgradeSelectorProps) {
  const currentWorkspace =
    workspaces.find((w) => w.slug === selectedSlug || w.id === selectedSlug) ||
    workspaces[0] ||
    null;

  const handleSelect = (wsSlug: string, wsId: string) => {
    setWorkspaceCookie(wsId);
    onSelectWorkspace(wsSlug, wsId);
  };

  if (workspaces.length === 0) {
    return (
      <Card className="shadow-xs border-amber-500/30 bg-amber-500/10">
        <CardContent className="flex flex-col items-center justify-between gap-4 p-4 text-amber-800 dark:text-amber-300 sm:flex-row">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="text-sm font-semibold">Tài khoản chưa có Workspace</p>
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Gói dịch vụ được gắn trực tiếp theo Workspace. Vui lòng tạo Workspace trước khi đăng
                ký gói.
              </p>
            </div>
          </div>
          <Button asChild size="sm" className="shrink-0 bg-amber-600 text-white hover:bg-amber-700">
            <Link href="/onboarding">
              <PlusCircle className="mr-1.5 h-4 w-4" />
              Tạo Workspace ngay
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-2xs group relative overflow-hidden border border-primary/20 bg-card/80 backdrop-blur-md transition-all duration-200 hover:border-primary/40 hover:shadow-md">
      <CardContent className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          {/* <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform duration-200 group-hover:scale-105">
            <Building2 className="h-5 w-5" />
          </div> */}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">{title}</span>
            </div>
            <p className="text-sm font-bold text-foreground">
              {currentWorkspace ? currentWorkspace.name : "Chưa chọn Workspace"}
              {currentWorkspace?.planName && (
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  (Đang dùng:{" "}
                  <span className="font-semibold text-foreground">{currentWorkspace.planName}</span>
                  )
                </span>
              )}
            </p>
          </div>
        </div>

        {workspaces.length > 1 ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="shadow-2xs group h-9 shrink-0 gap-2 border-primary/30 bg-background text-xs font-semibold transition-all duration-200 hover:border-primary hover:bg-primary/5 hover:text-primary data-[state=open]:border-primary data-[state=open]:bg-primary/10 data-[state=open]:text-primary"
              >
                <span>Đổi Workspace</span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 group-hover:text-primary group-data-[state=open]:rotate-180" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-64 rounded-xl border border-border/80 bg-card p-1.5 shadow-xl transition-all"
            >
              <DropdownMenuLabel className="px-2 py-1 text-[11px] font-medium text-muted-foreground">
                Thay đổi workspace:
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="my-1 bg-border/40" />
              <div className="max-h-56 space-y-1 overflow-y-auto p-0.5">
                {workspaces.map((ws) => {
                  const isActive =
                    ws.slug === currentWorkspace?.slug || ws.id === currentWorkspace?.id;
                  return (
                    <DropdownMenuItem
                      key={ws.id}
                      onClick={() => handleSelect(ws.slug, ws.id)}
                      className={cn(
                        "group/item flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 text-xs transition-all duration-150",
                        isActive
                          ? "border-primary/30 bg-primary/10 font-semibold text-primary hover:border-primary/40 hover:bg-primary/20 focus:bg-primary/20 focus:text-primary data-[highlighted]:border-primary/40 data-[highlighted]:bg-primary/20 data-[highlighted]:text-primary"
                          : "border-transparent bg-transparent text-foreground hover:border-primary/20 hover:bg-primary/10 hover:text-primary focus:border-primary/20 focus:bg-primary/10 focus:text-primary data-[highlighted]:border-primary/20 data-[highlighted]:bg-primary/10 data-[highlighted]:text-primary"
                      )}
                    >
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={cn(
                              "truncate text-xs transition-colors duration-150",
                              isActive
                                ? "font-bold text-primary"
                                : "font-medium text-foreground group-hover/item:text-primary group-data-[highlighted]/item:text-primary"
                            )}
                          >
                            {ws.name}
                          </span>
                          {ws.planName && (
                            <span className="shrink-0 rounded bg-muted/80 px-1.5 py-0.5 text-[9px] font-medium uppercase text-muted-foreground transition-colors duration-150 group-hover/item:bg-primary/20 group-hover/item:text-primary group-data-[highlighted]/item:bg-primary/20 group-data-[highlighted]/item:text-primary">
                              {ws.planName}
                            </span>
                          )}
                        </div>
                        <span className="truncate text-[10px] text-muted-foreground transition-colors duration-150 group-hover/item:text-primary/70 group-data-[highlighted]/item:text-primary/70">
                          slug: {ws.slug}
                        </span>
                      </div>
                      {isActive && (
                        <Check className="h-4 w-4 shrink-0 text-primary transition-transform duration-150 group-hover/item:scale-110 group-data-[highlighted]/item:scale-110" />
                      )}
                    </DropdownMenuItem>
                  );
                })}
              </div>
              <DropdownMenuSeparator className="my-1 bg-border/40" />
              <DropdownMenuItem
                asChild
                className="group/create cursor-pointer rounded-lg border border-transparent px-3 py-2.5 text-xs font-semibold text-primary transition-all duration-150 hover:border-primary/20 hover:bg-primary/10 hover:text-primary focus:border-primary/20 focus:bg-primary/10 data-[highlighted]:border-primary/20 data-[highlighted]:bg-primary/10"
              >
                <Link href="/onboarding" className="flex items-center gap-2">
                  <PlusCircle className="h-4 w-4 text-primary transition-transform duration-150 group-hover/create:scale-110 group-data-[highlighted]/create:scale-110" />
                  <span>Tạo Workspace mới</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-8 shrink-0 text-xs text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
          >
            <Link href="/onboarding" className="flex items-center gap-1.5">
              <PlusCircle className="h-3.5 w-3.5" />
              Tạo thêm Workspace
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
