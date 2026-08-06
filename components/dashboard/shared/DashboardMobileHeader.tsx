"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Book, ChevronDown, Home, LogOut, Check, Building2, Plus } from "lucide-react";
import { useWorkspace, WorkspaceItem } from "@/hooks/useWorkspace";

export interface DashboardMobileHeaderProps {
  fullName?: string;
  email?: string;
  currentPlanLabel?: string;
  onNavigateSettings?: () => void;
  onSignOut: () => Promise<void>;
}

export function DashboardMobileHeader({ fullName, email, onSignOut }: DashboardMobileHeaderProps) {
  const { activeWorkspace, workspaces, switchWorkspace, refreshWorkspaces } = useWorkspace();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const handleNameChange = (val: string) => {
    setName(val);
    const generatedSlug = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-");
    setSlug(generatedSlug);
    if (suggestions.length > 0) setSuggestions([]);
    if (error) setError(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuggestions([]);

    try {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.suggestions && Array.isArray(data.suggestions) && data.suggestions.length > 0) {
          setSuggestions(data.suggestions);
        } else {
          const rawErr =
            typeof data.error === "string"
              ? data.error
              : data.error?.message || "Không thể tạo workspace";

          if (
            rawErr.toLowerCase().includes("workspaces_slug_key") ||
            rawErr.toLowerCase().includes("duplicate key")
          ) {
            const cleanBase =
              slug.trim() ||
              name
                .toLowerCase()
                .trim()
                .replace(/[^a-z0-9-]/g, "") ||
              "workspace";
            setSuggestions([
              `${cleanBase}-1`,
              `${cleanBase}-2`,
              `${cleanBase}-${Math.floor(10 + Math.random() * 90)}`,
            ]);
          }
        }

        const errMsg =
          typeof data.error === "string"
            ? data.error
            : data.error?.message || "Không thể tạo workspace";
        throw new Error(errMsg);
      }

      await refreshWorkspaces();
      setIsModalOpen(false);
      setName("");
      setSlug("");
      setSuggestions([]);
      if (data.workspace?.slug) {
        switchWorkspace(data.workspace.slug);
      }
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <header className="glass-header sticky top-0 z-50 lg:hidden">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/images/logo-full.png"
                alt="Vielora"
                width={120}
                height={40}
                className="h-12 w-auto"
                priority
              />
            </Link>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="glass flex items-center gap-2">
                  <div className="bg-gradient-primary flex h-7 w-7 items-center justify-center rounded-lg">
                    <span className="text-xs font-medium text-primary-foreground">
                      {fullName?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="hidden text-left text-xs sm:block">
                    <p className="font-semibold leading-none">
                      {activeWorkspace?.name || fullName}
                    </p>
                    {activeWorkspace && (
                      <p className="mt-0.5 text-[10px] font-medium uppercase leading-none text-primary">
                        Gói {activeWorkspace.plans?.name || "Free"}
                      </p>
                    )}
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="glass-md w-64 p-1.5 shadow-xl">
                <div className="px-2.5 py-2">
                  <p className="text-sm font-semibold text-foreground">{fullName}</p>
                  <p className="text-xs text-muted-foreground">{email}</p>
                </div>

                <DropdownMenuSeparator className="my-1 bg-border/40" />
                <DropdownMenuLabel className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Điều hướng
                </DropdownMenuLabel>
                <DropdownMenuItem asChild>
                  <Link
                    href="/dashboard"
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs"
                  >
                    <Home className="h-3.5 w-3.5" />
                    Tổng quan
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link
                    href="/dashboard/workspace-knowledge"
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs"
                  >
                    <Book className="h-3.5 w-3.5" />
                    Kiến thức chung
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuSeparator className="my-1 bg-border/40" />

                <DropdownMenuLabel className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Workspace
                </DropdownMenuLabel>
                <div className="max-h-40 space-y-0.5 overflow-y-auto">
                  {workspaces.map((ws: WorkspaceItem) => {
                    const isActive = activeWorkspace?.id === ws.id;
                    const planName = ws.plans?.name || "Free";
                    const planNameLower = planName.toLowerCase();
                    const badgeClass = planNameLower.includes("pro")
                      ? "bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20 font-semibold"
                      : planNameLower.includes("standard")
                        ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-semibold"
                        : "bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20 font-medium";

                    return (
                      <DropdownMenuItem
                        key={ws.id}
                        onClick={() => switchWorkspace(ws.slug)}
                        className="flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-colors hover:bg-primary/10 hover:text-primary focus:bg-primary/10 focus:text-primary"
                      >
                        <div className="mr-2 flex min-w-0 flex-1 items-center justify-between gap-1.5">
                          <div className="flex min-w-0 items-center gap-2">
                            <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <span className="truncate font-medium">{ws.name}</span>
                          </div>
                          <span
                            className={`shrink-0 rounded-md px-1.5 py-0.5 text-[9px] uppercase ${badgeClass}`}
                          >
                            {planName}
                          </span>
                        </div>
                        {isActive && <Check className="h-4 w-4 shrink-0 text-primary" />}
                      </DropdownMenuItem>
                    );
                  })}
                </div>

                <DropdownMenuItem
                  onClick={() => setIsModalOpen(true)}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10 hover:text-primary focus:bg-primary/10 focus:text-primary"
                >
                  <Plus className="h-4 w-4" />
                  Tạo Workspace mới
                </DropdownMenuItem>

                <DropdownMenuSeparator className="my-1 bg-border/40" />

                <DropdownMenuItem
                  onClick={() => void onSignOut()}
                  className="text-xs text-destructive focus:bg-destructive/10 focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Đăng xuất
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <Dialog
        open={isModalOpen}
        onOpenChange={(open) => {
          setIsModalOpen(open);
          if (!open) {
            setError(null);
            setSuggestions([]);
          }
        }}
      >
        <DialogContent className="rounded-2xl border-border/80 bg-card p-6 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Tạo Workspace mới</DialogTitle>
          </DialogHeader>
          {error && (
            <div className="rounded-lg bg-destructive/10 p-3 text-xs text-destructive">{error}</div>
          )}
          <form onSubmit={handleCreate} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="mobile-ws-name" className="text-xs font-medium">
                Tên Workspace
              </Label>
              <Input
                id="mobile-ws-name"
                required
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="VD: Workspace của tôi"
                className="h-9 rounded-lg border-border/60 bg-muted/40 text-xs focus-visible:ring-primary"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mobile-ws-slug" className="text-xs font-medium">
                Workspace Slug
              </Label>
              <Input
                id="mobile-ws-slug"
                type="text"
                required
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
                  if (suggestions.length > 0) setSuggestions([]);
                  if (error) setError(null);
                }}
                placeholder="VD: workspace-cua-toi"
                className="h-9 rounded-lg border-border/60 bg-muted/40 text-xs focus-visible:ring-primary"
              />
              {suggestions.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
                  <span className="text-[11px] font-medium text-muted-foreground">Gợi ý:</span>
                  {suggestions.map((sug) => (
                    <Badge
                      key={sug}
                      variant="outline"
                      onClick={() => {
                        setSlug(sug);
                        setSuggestions([]);
                        setError(null);
                      }}
                      className="cursor-pointer border-primary/30 bg-primary/5 text-[11px] text-primary transition-all hover:border-primary/50 hover:bg-primary/20"
                    >
                      {sug}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg text-xs transition-colors hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
              >
                Hủy
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isLoading}
                className="rounded-lg text-xs font-medium"
              >
                {isLoading ? "Đang tạo..." : "Tạo Workspace"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
