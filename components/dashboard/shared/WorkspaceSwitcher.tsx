"use client";

import { useState } from "react";
import { useWorkspace, WorkspaceItem } from "@/hooks/useWorkspace";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronsUpDown, Plus, Building2, ShieldCheck, LayoutDashboard } from "lucide-react";

export function WorkspaceSwitcher() {
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
        window.location.href = "/" + encodeURIComponent(data.workspace.slug);
      }
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const getPlanBadgeClass = (planName?: string) => {
    const name = (planName || "").toLowerCase();
    if (name.includes("pro")) {
      return "bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20 font-semibold";
    }
    if (name.includes("standard")) {
      return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-semibold";
    }
    return "bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20 font-medium";
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex w-full items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/40 p-2 text-left transition-all hover:border-border hover:bg-muted/80">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">
                <Building2 className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-xs font-semibold text-foreground">
                    {activeWorkspace?.name || "Chọn Workspace"}
                  </p>
                  {activeWorkspace && (
                    <span
                      className={`shrink-0 rounded-md px-1.5 py-0.5 text-[9px] uppercase ${getPlanBadgeClass(
                        activeWorkspace.plans?.name
                      )}`}
                    >
                      {activeWorkspace.plans?.name || "Free"}
                    </span>
                  )}
                </div>
                <p className="truncate text-[11px] text-muted-foreground">
                  {activeWorkspace?.slug ? activeWorkspace.slug : "Chưa chọn workspace"}
                </p>
              </div>
            </div>
            <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="w-60 rounded-xl border-border/60 bg-card p-1.5 shadow-xl"
        >
          <DropdownMenuLabel className="px-2 py-1.5 text-[11px] font-medium text-muted-foreground">
            Danh sách Workspaces
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="my-1 bg-border/40" />
          <div className="max-h-56 space-y-0.5 overflow-y-auto">
            {workspaces.map((ws: WorkspaceItem) => {
              const isActive = activeWorkspace?.id === ws.id;
              const planName = ws.plans?.name || "Free";
              return (
                <DropdownMenuItem
                  key={ws.id}
                  onClick={() => switchWorkspace(ws.slug)}
                  className="flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 text-xs transition-colors hover:bg-muted/80 focus:bg-muted/80"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1.5 pr-1">
                      <p
                        className={`truncate text-xs ${isActive ? "font-semibold text-primary" : "font-medium text-foreground"}`}
                      >
                        {ws.name}
                      </p>
                      <span
                        className={`shrink-0 rounded-md px-1.5 py-0.5 text-[9px] uppercase ${getPlanBadgeClass(
                          planName
                        )}`}
                      >
                        {planName}
                      </span>
                    </div>
                    <p className="flex items-center gap-1 truncate text-[10px] text-muted-foreground">
                      <ShieldCheck className="h-3 w-3 text-emerald-500" />
                      <span className="capitalize">{ws.role || "member"}</span>
                    </p>
                  </div>
                  {isActive && <Check className="h-4 w-4 shrink-0 text-primary" />}
                </DropdownMenuItem>
              );
            })}
          </div>
          <DropdownMenuSeparator className="my-1 bg-border/40" />
          <DropdownMenuItem
            onClick={() => setIsModalOpen(true)}
            className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/10 hover:text-primary focus:bg-primary/10 focus:text-primary"
          >
            <Plus className="h-4 w-4" />
            Tạo Workspace mới
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

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
        <DialogContent className="rounded-2xl border-border/80 bg-card p-6 shadow-xl sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <LayoutDashboard className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-foreground">
                  Tạo Workspace mới
                </DialogTitle>
                <p className="text-xs text-muted-foreground">
                  Tạo không gian làm việc riêng để quản lý chatbot, tri thức và thành viên
                </p>
              </div>
            </div>
          </DialogHeader>
          {error && (
            <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs font-medium text-destructive">
              {error}
            </div>
          )}
          <form onSubmit={handleCreate} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="ws-name" className="text-xs font-semibold">
                Tên Workspace
              </Label>
              <Input
                id="ws-name"
                required
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="VD: Workspace của tôi"
                className="h-10 rounded-xl border-border/60 bg-muted/30 text-xs focus-visible:ring-primary"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ws-slug" className="text-xs font-semibold">
                Workspace Slug
              </Label>
              <Input
                id="ws-slug"
                type="text"
                required
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
                  if (suggestions.length > 0) setSuggestions([]);
                  if (error) setError(null);
                }}
                placeholder="VD: workspace-cua-toi"
                className="h-10 rounded-xl border-border/60 bg-muted/30 text-xs focus-visible:ring-primary"
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
            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl border-border/60 text-xs font-medium hover:bg-muted"
              >
                Hủy
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isLoading}
                className="rounded-xl bg-primary font-semibold text-primary-foreground shadow-md transition-all hover:bg-primary/90"
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
