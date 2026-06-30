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
import {
  Crown,
  Check,
  Sparkles,
  Brain,
  Lock,
  Info,
  Eye,
  MessageCircle,
  Users,
  Zap,
  Target,
  Star,
  Coffee,
  HeartHandshake,
  HeadphonesIcon,
  Wrench,
  PenLine,
  Languages,
  BarChart3,
  ShieldCheck,
  Briefcase,
} from "lucide-react";
import { MAX_SKILLS_PER_BOT } from "@/lib/config/ai-customization";
import type { PersonalityOption, SkillOption } from "@/store/useAIConfigStore";

export interface AIConfiguratorProps {
  botId: string;
  currentPlan: string;
  initialPersonalityId: string | null;
  initialSkillIds: string[];
  onSaved?: () => void;
}

const personalityIcons: Record<string, typeof Sparkles> = {
  "Chuyên nghiệp": Briefcase,
  "Thân thiện": HeartHandshake,
  "Năng động (Gen Z)": Zap,
  "Tối giản": Target,
  "Huấn luyện viên": Star,
  "Hài hước & dí dỏm": Coffee,
};

const skillIcons: Record<string, typeof Brain> = {
  "Tư vấn bán hàng": MessageCircle,
  "Chăm sóc khách hàng": HeadphonesIcon,
  "Hỗ trợ kỹ thuật": Wrench,
  "Viết nội dung": PenLine,
  "Dạy ngôn ngữ": Languages,
  "Phân tích dữ liệu": BarChart3,
  "Chăm sóc sức khỏe": ShieldCheck,
  "Huấn luyện phỏng vấn": Users,
};

function getIcon(name: string, type: "personality" | "skill", className: string) {
  if (type === "personality") {
    const Icon = personalityIcons[name] || Sparkles;
    return <Icon className={className} />;
  }
  const Icon = skillIcons[name] || Brain;
  return <Icon className={className} />;
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

  const memoizedInitialSkillIds = useMemo(() => initialSkillIds, [serializedInitialSkillIds]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    initializeFromBot(initialPersonalityId, memoizedInitialSkillIds);
  }, [initializeFromBot, initialPersonalityId, memoizedInitialSkillIds]);

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
    <div className="space-y-8">
      <Card className="overflow-hidden border-border/40 shadow-sm">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        <CardHeader className="flex flex-col gap-4 space-y-0 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-1.5">
            <CardTitle className="flex items-center gap-2.5 text-lg">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Sparkles className="h-4 w-4 text-primary" />
              </span>
              Tính cách
            </CardTitle>
            <CardDescription className="text-sm">
              Chọn một tính cách để định hình giọng nói và phong cách giao tiếp
            </CardDescription>
          </div>
          {store.selectedPersonalityId && (
            <Badge className="shrink-0 border-emerald-200 bg-emerald-50 text-[11px] font-semibold uppercase tracking-wider text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/40 dark:text-emerald-400">
              <Check className="mr-1 h-3 w-3" />
              Đã chọn
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          {store.isLoading ? (
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-[72px] rounded-xl" />
              <Skeleton className="h-[72px] rounded-xl" />
              <Skeleton className="h-[72px] rounded-xl" />
              <Skeleton className="h-[72px] rounded-xl" />
            </div>
          ) : store.personalityOptions.length === 0 ? (
            <EmptyState type="personality" onRetry={fetchCatalogs} />
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {store.personalityOptions.map((p) => {
                const isSelected = store.selectedPersonalityId === p.id;
                return (
                  <PersonalityCard
                    key={p.id}
                    personality={p}
                    isSelected={isSelected}
                    onSelect={() => store.setSelectedPersonalityId(isSelected ? null : p.id)}
                  />
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden border-border/40 shadow-sm">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        <CardHeader className="flex flex-col gap-4 space-y-0 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-1.5">
            <CardTitle className="flex items-center gap-2.5 text-lg">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Brain className="h-4 w-4 text-primary" />
              </span>
              Kỹ năng
            </CardTitle>
            <CardDescription className="text-sm">
              Chọn tối đa {MAX_SKILLS_PER_BOT} kỹ năng để chatbot hỗ trợ tốt hơn
            </CardDescription>
          </div>
          <Badge
            variant="outline"
            className={`shrink-0 text-[11px] font-semibold uppercase tracking-wider ${
              skillsFull
                ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800/40 dark:bg-blue-950/40 dark:text-blue-400"
                : "border-border/60 bg-muted/50 text-muted-foreground"
            }`}
          >
            <Info className="mr-1 h-3 w-3" />
            {skillCount}/{MAX_SKILLS_PER_BOT}
          </Badge>
        </CardHeader>
        <CardContent>
          {store.isLoading ? (
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-[72px] rounded-xl" />
              <Skeleton className="h-[72px] rounded-xl" />
              <Skeleton className="h-[72px] rounded-xl" />
              <Skeleton className="h-[72px] rounded-xl" />
            </div>
          ) : store.skillOptions.length === 0 ? (
            <EmptyState type="skill" onRetry={fetchCatalogs} />
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {store.skillOptions.map((s) => {
                const isSelected = store.selectedSkillIds.includes(s.id);
                const cannotSelect = !isSelected && skillsFull;
                return (
                  <SkillCard
                    key={s.id}
                    skill={s}
                    isSelected={isSelected}
                    cannotSelect={cannotSelect}
                    onToggle={() => store.toggleSkill(s.id)}
                  />
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-4">
        {hasChanges && (
          <p className="pl-2 text-[13px] text-red-600">(*) Bạn có thay đổi chưa được lưu</p>
        )}
        <div className="flex-1" />
        <Button
          onClick={handleSave}
          disabled={store.isSaving || !hasChanges}
          size="lg"
          className="min-w-[140px] gap-2"
        >
          {store.isSaving ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Đang lưu...
            </>
          ) : (
            <>
              <Check className="h-4 w-4" />
              Lưu thay đổi
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function PersonalityCard({
  personality,
  isSelected,
  onSelect,
}: {
  personality: PersonalityOption;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      className={`group relative overflow-hidden rounded-xl border transition-all duration-200 ${
        isSelected
          ? "border-primary/60 bg-primary/[0.04] shadow-[0_0_24px_-6px] shadow-primary/20"
          : "border-border/60 bg-card hover:border-primary/30 hover:bg-primary/[0.02] hover:shadow-sm"
      }`}
    >
      {isSelected && (
        <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-primary/20" />
      )}
      {isSelected && (
        <div className="pointer-events-none absolute -inset-px rounded-xl bg-gradient-to-b from-primary/[0.07] to-transparent opacity-60" />
      )}
      <div className="flex items-center gap-3 px-4 py-3">
        <button type="button" onClick={onSelect} className="flex flex-1 items-center gap-3">
          <div
            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-md border-2 transition-all duration-200 ${
              isSelected
                ? "scale-110 border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/30"
                : "border-muted-foreground/25 group-hover:border-primary/50"
            }`}
          >
            {isSelected && <Check className="h-3 w-3" />}
          </div>
          <span className="flex items-center gap-2 font-semibold text-foreground">
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[13px] transition-colors ${
                isSelected
                  ? "bg-primary/15 text-primary"
                  : "bg-muted/80 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
              }`}
            >
              {getIcon(personality.name, "personality", "h-3.5 w-3.5")}
            </span>
            <span className="truncate text-[15px]">{personality.name}</span>
          </span>
        </button>
        <DetailEyeButton item={personality} type="personality" />
      </div>
    </div>
  );
}

function SkillCard({
  skill,
  isSelected,
  cannotSelect,
  onToggle,
}: {
  skill: SkillOption;
  isSelected: boolean;
  cannotSelect: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={`group relative overflow-hidden rounded-xl border transition-all duration-200 ${
        isSelected
          ? "border-primary/60 bg-primary/[0.04] shadow-[0_0_24px_-6px] shadow-primary/20"
          : cannotSelect
            ? "cursor-not-allowed border-border/40 bg-muted/30 opacity-45"
            : "border-border/60 bg-card hover:border-primary/30 hover:bg-primary/[0.02] hover:shadow-sm"
      }`}
    >
      {isSelected && (
        <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-primary/20" />
      )}
      {isSelected && (
        <div className="pointer-events-none absolute -inset-px rounded-xl bg-gradient-to-b from-primary/[0.07] to-transparent opacity-60" />
      )}
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          disabled={cannotSelect}
          onClick={onToggle}
          className="flex flex-1 items-center gap-3"
        >
          <div
            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-md border-2 transition-all duration-200 ${
              isSelected
                ? "scale-110 border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/30"
                : cannotSelect
                  ? "border-muted-foreground/15"
                  : "border-muted-foreground/25 group-hover:border-primary/50"
            }`}
          >
            {isSelected && <Check className="h-3 w-3" />}
          </div>
          <span className="flex items-center gap-2 font-semibold text-foreground">
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[13px] transition-colors ${
                isSelected
                  ? "bg-primary/15 text-primary"
                  : "bg-muted/80 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
              }`}
            >
              {getIcon(skill.name, "skill", "h-3.5 w-3.5")}
            </span>
            <span className="truncate text-[15px]">{skill.name}</span>
          </span>
        </button>
        {cannotSelect ? (
          <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
        ) : (
          <DetailEyeButton item={skill} type="skill" />
        )}
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
  const isPersonality = type === "personality";
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground/60 opacity-0 transition-all duration-200 hover:bg-primary/10 hover:text-primary focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 group-hover:opacity-100"
          title="Xem chi tiết"
        >
          <Eye className="h-3.5 w-3.5" />
        </button>
      </DialogTrigger>
      <DialogContent className="overflow-hidden border-border/40 p-0 shadow-2xl sm:max-w-md">
        <div className="relative">
          <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-primary/[0.08] to-transparent" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
          <DialogHeader className="relative space-y-0 p-8 pb-0">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
                {getIcon(item.name, type, "h-4 w-4 text-primary")}
              </div>
              <div className="flex-1">
                <DialogTitle className="text-lg font-semibold">{item.name}</DialogTitle>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary">
                {isPersonality ? <Sparkles className="h-3 w-3" /> : <Brain className="h-3 w-3" />}
                {isPersonality ? "Tính cách" : "Kỹ năng"}
              </span>
            </div>
          </DialogHeader>
          <div className="px-6 pb-6">
            <div className="rounded-xl border bg-muted/30 p-4">
              <DialogDescription className="text-sm leading-relaxed text-foreground/80">
                {item.description ?? item.prompt_injection}
              </DialogDescription>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EmptyState({ type, onRetry }: { type: "personality" | "skill"; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 px-6 py-10">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted/60">
        {type === "personality" ? (
          <Sparkles className="h-5 w-5 text-muted-foreground/50" />
        ) : (
          <Brain className="h-5 w-5 text-muted-foreground/50" />
        )}
      </div>
      <p className="mb-1 text-sm font-medium text-foreground/70">
        Không có {type === "personality" ? "tính cách" : "kỹ năng"} nào
      </p>
      <p className="mb-4 text-xs text-muted-foreground/50">
        Không thể tải danh sách. Vui lòng thử lại.
      </p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Thử lại
      </Button>
    </div>
  );
}

function LockedState() {
  return (
    <Card className="relative overflow-hidden border-border/40 shadow-sm">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      <CardHeader>
        <CardTitle className="flex items-center gap-2.5 text-lg">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Sparkles className="h-4.5 w-4.5 text-primary" />
          </span>
          Tùy chỉnh tính cách & kỹ năng
        </CardTitle>
        <CardDescription className="text-sm">
          Tuỳ chỉnh tính cách và kỹ năng cho chatbot
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-background via-muted/20 to-muted/30 shadow-sm">
          <div className="pointer-events-none space-y-3 p-6 opacity-30 blur-[1.5px]">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="h-[52px] rounded-xl border border-border/50 bg-background/60" />
              <div className="h-[52px] rounded-xl border border-border/50 bg-background/60" />
              <div className="h-[52px] rounded-xl border border-border/50 bg-background/60" />
              <div className="h-[52px] rounded-xl border border-border/50 bg-background/60" />
            </div>
          </div>

          <div className="absolute inset-0 flex items-center justify-center bg-background/40 backdrop-blur-[1px]">
            <div className="mx-4 max-w-sm text-center">
              <div className="bg-gradient-primary mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg shadow-primary/25">
                <Crown className="h-7 w-7 text-white" />
              </div>
              <p className="mb-1 text-[15px] font-semibold text-foreground">
                Nâng cấp để mở khóa tính năng này
              </p>
              <p className="mb-5 text-[13px] leading-relaxed text-muted-foreground">
                Gói Standard trở lên bao gồm tùy chỉnh tính cách, kỹ năng và nhiều hơn nữa
              </p>
              <Link
                href="/dashboard/upgrade"
                className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-[13px] font-medium text-primary-foreground shadow-sm shadow-primary/25 transition-all hover:bg-primary/90 hover:shadow-md active:scale-[0.97]"
              >
                <Crown className="h-3.5 w-3.5" />
                Xem gói nâng cấp
              </Link>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
