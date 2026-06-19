"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { useAIConfigStore } from "@/store/useAIConfigStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Crown, Check, Sparkles, Brain, Lock, Info, Eye } from "lucide-react";
import { MAX_SKILLS_PER_BOT } from "@/lib/config/ai-customization";
import type { PersonalityOption, SkillOption } from "@/store/useAIConfigStore";

export interface AIConfiguratorProps {
  botId: string;
  currentPlan: string;
  initialPersonalityId: string | null;
  initialSkillIds: string[];
  onSaved?: () => void;
}

export function AIConfigurator({
  botId,
  currentPlan,
  initialPersonalityId,
  initialSkillIds,
  onSaved,
}: AIConfiguratorProps) {
  const { toast } = useToast();
  const store = useAIConfigStore();
  const { initializeFromBot } = store;
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [hasChanges, setHasChanges] = useState(false);

  const isLocked = currentPlan === "free";

  const serializedSelectedSkillIds = JSON.stringify([...store.selectedSkillIds].sort());
  const serializedInitialSkillIds = JSON.stringify([...initialSkillIds].sort());

  useEffect(() => {
    initializeFromBot(initialPersonalityId, initialSkillIds);
  }, [initializeFromBot, initialPersonalityId, initialSkillIds]);

  useEffect(() => {
    fetchCatalogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setHasChanges(
      store.selectedPersonalityId !== initialPersonalityId ||
        serializedSelectedSkillIds !== serializedInitialSkillIds
    );
  }, [
    store.selectedPersonalityId,
    serializedSelectedSkillIds,
    initialPersonalityId,
    serializedInitialSkillIds,
  ]);

  async function getAuthHeaders(): Promise<Record<string, string>> {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) throw new Error("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  }

  async function fetchCatalogs() {
    store.setIsLoading(true);
    try {
      const headers = await getAuthHeaders();
      const [persRes, skillRes] = await Promise.all([
        fetch("/api/bots/personalities", { headers }),
        fetch("/api/bots/skills", { headers }),
      ]);
      const persData = await persRes.json();
      const skillData = await skillRes.json();
      if (persData.success) store.setPersonalityOptions(persData.data);
      if (skillData.success) store.setSkillOptions(skillData.data);
    } catch (err) {
      console.error("Failed to fetch AI catalogs:", err);
      toast({
        title: "Lỗi",
        description: "Không thể tải danh sách tính cách và kỹ năng.",
        variant: "destructive",
      });
    } finally {
      store.setIsLoading(false);
    }
  }

  async function handleSave() {
    store.setIsSaving(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/bots/${botId}/config`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          personalityId: store.selectedPersonalityId,
          skillIds: store.selectedSkillIds,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Đã lưu", description: "Thay đổi đã được cập nhật." });
        setHasChanges(false);
        onSaved?.();
      } else {
        toast({ title: "Lỗi", description: data.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Lỗi", description: "Không thể lưu thay đổi.", variant: "destructive" });
    } finally {
      store.setIsSaving(false);
    }
  }

  if (isLocked) {
    return <LockedState />;
  }

  const skillCount = store.selectedSkillIds.length;
  const skillsFull = skillCount >= MAX_SKILLS_PER_BOT;

  return (
    <div className="space-y-6">
      <Card className="glass">
        <CardHeader className="flex flex-col gap-4 space-y-0 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Tính cách
            </CardTitle>
            <CardDescription>Chọn tính cách cho chatbot của bạn</CardDescription>
          </div>
          {store.selectedPersonalityId && (
            <Badge
              variant="outline"
              className="shrink-0 border-0 bg-emerald-100 text-[10px] font-medium uppercase tracking-wide text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
            >
              <Check className="mr-1 h-3 w-3" />
              Đã chọn
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          {store.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {store.personalityOptions.map((p) => {
                const isSelected = store.selectedPersonalityId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => store.setSelectedPersonalityId(isSelected ? null : p.id)}
                    className={`flex items-center gap-3 rounded-xl border px-4 py-2 text-left transition-all hover:shadow-md ${
                      isSelected
                        ? "shadow-primary/2 border-primary shadow-md hover:border-primary"
                        : "border-border hover:border-primary/30 hover:bg-white"
                    }`}
                  >
                    <div
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border ${
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted-foreground/30"
                      }`}
                    >
                      {isSelected && <Check className="h-3.5 w-3.5" />}
                    </div>
                    <span className="flex-1 truncate font-semibold text-foreground">{p.name}</span>
                    <DetailEyeButton item={p} type="personality" />
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="glass">
        <CardHeader className="flex flex-col gap-4 space-y-0 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              Kỹ năng
            </CardTitle>
            <CardDescription>Chọn tối đa {MAX_SKILLS_PER_BOT} kỹ năng cho chatbot</CardDescription>
          </div>
          <Badge
            variant="outline"
            className={`shrink-0 border-0 text-[10px] font-medium uppercase tracking-wide ${
              skillsFull
                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                : "bg-muted text-muted-foreground"
            }`}
          >
            <Info className="mr-1 h-3 w-3" />
            {skillCount}/{MAX_SKILLS_PER_BOT}
          </Badge>
        </CardHeader>
        <CardContent>
          {store.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {store.skillOptions.map((s) => {
                const isSelected = store.selectedSkillIds.includes(s.id);
                const cannotSelect = !isSelected && skillsFull;
                return (
                  <button
                    key={s.id}
                    type="button"
                    disabled={cannotSelect}
                    onClick={() => store.toggleSkill(s.id)}
                    className={`flex items-center gap-3 rounded-xl border px-4 py-2 text-left transition-all ${
                      isSelected
                        ? "border-primary shadow-md shadow-primary/20"
                        : cannotSelect
                          ? "cursor-not-allowed border-border/50 opacity-50"
                          : "border-border hover:border-primary/50 hover:bg-muted/50"
                    }`}
                  >
                    <div
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border ${
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : cannotSelect
                            ? "border-muted-foreground/20"
                            : "border-muted-foreground/30"
                      }`}
                    >
                      {isSelected && <Check className="h-3.5 w-3.5" />}
                    </div>
                    <span className="flex-1 truncate font-semibold text-foreground">{s.name}</span>
                    {cannotSelect && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                    {!cannotSelect && <DetailEyeButton item={s} type="skill" />}
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={store.isSaving || !hasChanges}>
          {store.isSaving ? "Đang lưu..." : "Lưu thay đổi"}
        </Button>
      </div>
    </div>
  );
}

function DetailEyeButton({
  item,
  type,
}: {
  item: PersonalityOption | SkillOption;
  type: "personality" | "skill";
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-primary/20 hover:text-primary"
          title="Xem chi tiết"
        >
          <Eye className="h-4 w-4 text-muted-foreground hover:text-primary" />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {type === "personality" ? (
              <Sparkles className="h-5 w-5 text-primary" />
            ) : (
              <Brain className="h-5 w-5 text-primary" />
            )}
            {item.name}
          </DialogTitle>
          <DialogDescription className="pt-3 text-sm leading-relaxed text-foreground/80">
            {item.prompt_injection}
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}

function LockedState() {
  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Tùy chỉnh tính cách & kỹ năng
        </CardTitle>
        <CardDescription>Tuỳ chỉnh tính cách và kỹ năng cho chatbot</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-background via-muted/20 to-muted/40 p-8 shadow-sm">
          <div className="pointer-events-none space-y-3 p-4 opacity-55 blur-[2px]">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-xl border border-border/60 bg-background/80 p-4">
                <div className="mb-2 h-10 w-24 rounded bg-muted-foreground/20" />
              </div>
              <div className="rounded-xl border border-border/60 bg-background/80 p-4">
                <div className="mb-2 h-10 w-24 rounded bg-muted-foreground/20" />
              </div>
              <div className="rounded-xl border border-border/60 bg-background/80 p-4">
                <div className="mb-2 h-10 w-24 rounded bg-muted-foreground/20" />
              </div>
            </div>
          </div>

          <div className="absolute inset-0 flex items-center justify-center bg-background/65 backdrop-blur-[2px]">
            <div className="mx-4 max-w-sm text-center">
              <div className="bg-gradient-primary mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full shadow-lg">
                <Crown className="h-6 w-6 text-white" />
              </div>
              <p className="text-sm font-semibold text-foreground">
                Nâng cấp gói để sử dụng tính năng này
              </p>
              <Link
                href="/dashboard/upgrade"
                className="inline-block text-xs font-medium text-primary underline decoration-dotted underline-offset-4 transition-colors hover:text-primary/80"
              >
                Xem gói nâng cấp
              </Link>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
