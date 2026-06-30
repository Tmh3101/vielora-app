"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Bot, CheckCircle, ChevronDown, Link2, Sparkles } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { StandaloneChatSharePanel } from "@/components/dashboard/StandaloneChatSharePanel";
import { AIConfigurator } from "@/components/shared/AIConfigurator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { EPageStatus } from "@/types";
import { useOnboardingStore } from "@/store/useOnboardingStore";
import {
  ONBOARDING_SUCCESS_BOT_KEY,
  ONBOARDING_SUCCESS_INDEXED_COUNT_KEY,
  ONBOARDING_SUCCESS_PLAN_KEY,
  ONBOARDING_SUCCESS_AI_CONFIG_KEY,
} from "@/lib/constants/react-query-key";

export interface Step4SuccessProps {
  botId: string;
}

interface BotInfo {
  name: string;
  avatar_url: string | null;
  slug: string | null;
  is_public: boolean;
}

export function Step4Success({ botId }: Step4SuccessProps) {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const reset = useOnboardingStore((state) => state.reset);
  const [isStandalonePanelOpen, setIsStandalonePanelOpen] = useState(false);
  const [isAIConfigOpen, setIsAIConfigOpen] = useState(false);
  const [standaloneSlug, setStandaloneSlug] = useState("");
  const [standaloneIsPublic, setStandaloneIsPublic] = useState(false);
  const [isSavingStandalone, setIsSavingStandalone] = useState(false);

  const botQuery = useQuery({
    queryKey: [ONBOARDING_SUCCESS_BOT_KEY, botId],
    queryFn: async (): Promise<BotInfo | null> => {
      const { data, error } = await supabase
        .from("bots")
        .select("name, avatar_url, slug, is_public")
        .eq("id", botId)
        .maybeSingle();

      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!botId,
    retry: 1,
  });

  const indexedCountQuery = useQuery({
    queryKey: [ONBOARDING_SUCCESS_INDEXED_COUNT_KEY, botId],
    queryFn: async (): Promise<number> => {
      const { count, error } = await supabase
        .from("pages")
        .select("id", { count: "exact", head: true })
        .eq("bot_id", botId)
        .in("status", [EPageStatus.Completed]);

      if (error) throw new Error(error.message);
      return count ?? 0;
    },
    enabled: !!botId,
    retry: 1,
  });

  const planQuery = useQuery({
    queryKey: [ONBOARDING_SUCCESS_PLAN_KEY, botId],
    queryFn: async (): Promise<string> => {
      const authResult = await supabase.auth.getUser();
      const user = authResult.data?.user;
      if (!user) return "free";

      const subResult = (await supabase
        .from("subscriptions")
        .select("plans!inner(code)")
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle()) as unknown as { data: { plans: { code: string } } | null };

      const planCode = subResult.data?.plans?.code;
      return planCode ?? "free";
    },
    enabled: !!botId,
    retry: 1,
  });

  const aiConfigQuery = useQuery({
    queryKey: [ONBOARDING_SUCCESS_AI_CONFIG_KEY, botId],
    queryFn: async (): Promise<{
      personalityId: string | null;
      skillIds: string[];
    }> => {
      const botResult = (await supabase
        .from("bots")
        .select("personality_id")
        .eq("id", botId)
        .maybeSingle()) as unknown as { data: { personality_id: string | null } | null };

      const { data: skills } = (await supabase
        .from("bot_skills")
        .select("skill_id")
        .eq("bot_id", botId)) as unknown as { data: { skill_id: string }[] | null };

      return {
        personalityId: botResult.data?.personality_id ?? null,
        skillIds: skills?.map((s) => s.skill_id) ?? [],
      };
    },
    enabled: !!botId,
    retry: 1,
  });

  const botName = botQuery.data?.name ?? "Chatbot";
  const botAvatarUrl = botQuery.data?.avatar_url ?? null;
  const savedStandaloneSlug = botQuery.data?.slug ?? null;
  const pagesIndexed = indexedCountQuery.data ?? 0;
  const currentPlan = planQuery.data ?? "free";

  useEffect(() => {
    if (!botQuery.data) return;

    setStandaloneSlug(botQuery.data.slug ?? "");
    setStandaloneIsPublic(botQuery.data.is_public ?? false);
  }, [botQuery.data]);

  const handleSaveStandaloneSettings = async () => {
    setIsSavingStandalone(true);
    try {
      const response = await fetch(`/api/bots/${botId}/slug-settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: standaloneSlug || null, isPublic: standaloneIsPublic }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || "Failed to save slug settings");
      }

      queryClient.setQueryData<BotInfo | null>([ONBOARDING_SUCCESS_BOT_KEY, botId], (current) =>
        current
          ? {
              ...current,
              slug: standaloneSlug || null,
              is_public: standaloneIsPublic,
            }
          : current
      );

      toast({
        title: "Thành công",
        description: "Đã lưu cài đặt trang chat độc lập.",
      });
    } catch (error) {
      console.error("Save standalone chat settings error:", error);
      toast({
        title: "Lỗi",
        description: error instanceof Error ? error.message : "Không thể lưu cài đặt.",
        variant: "destructive",
      });
    } finally {
      setIsSavingStandalone(false);
    }
  };

  return (
    <Card className="mx-auto max-w-3xl">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <CardTitle>Chatbot đã sẵn sàng!</CardTitle>
        <CardDescription>Bot đã học xong {pagesIndexed} nguồn dữ liệu của bạn</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-primary">
                {botAvatarUrl ? (
                  <Image
                    src={botAvatarUrl}
                    alt={botName}
                    width={48}
                    height={48}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Bot className="h-6 w-6 text-primary-foreground" />
                )}
              </div>
              <div>
                <p className="font-semibold text-foreground">{botName}</p>
                <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                  Đang hoạt động
                </div>
              </div>
            </div>
            <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-50">
              {pagesIndexed} nguồn
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Button
            variant="outline"
            onClick={() => {
              reset();
              router.push("/dashboard");
            }}
            className="hover:border-primary hover:bg-white hover:text-primary"
          >
            Trở về Dashboard
          </Button>
          <Button
            onClick={() => {
              reset();
              router.push(`/dashboard/bots/${botId}`);
            }}
          >
            Cài đặt Widget
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-3">
          <Button
            type="button"
            variant="outline"
            aria-expanded={isAIConfigOpen}
            className="w-full justify-between hover:border-primary hover:bg-white hover:text-primary"
            onClick={() => setIsAIConfigOpen((current) => !current)}
          >
            <span className="flex items-center">
              <Sparkles className="mr-2 h-4 w-4" />
              Tuỳ chỉnh tính cách và kỹ năng
            </span>
            <ChevronDown
              className={`h-4 w-4 transition-transform ${isAIConfigOpen ? "rotate-180" : ""}`}
            />
          </Button>

          {isAIConfigOpen && (
            <div className="rounded-xl border bg-muted/20 p-4 shadow-sm">
              <AIConfigurator
                botId={botId}
                currentPlan={currentPlan}
                initialPersonalityId={aiConfigQuery.data?.personalityId ?? null}
                initialSkillIds={aiConfigQuery.data?.skillIds ?? []}
                onSaved={() => aiConfigQuery.refetch()}
              />
            </div>
          )}
        </div>

        <div className="space-y-3">
          <Button
            type="button"
            variant="outline"
            aria-expanded={isStandalonePanelOpen}
            className="w-full justify-between hover:border-primary hover:bg-white hover:text-primary"
            onClick={() => setIsStandalonePanelOpen((current) => !current)}
          >
            <span className="flex items-center">
              <Link2 className="mr-2 h-4 w-4" />
              Tạo trang chat độc lập
            </span>
            <ChevronDown
              className={`h-4 w-4 transition-transform ${
                isStandalonePanelOpen ? "rotate-180" : ""
              }`}
            />
          </Button>

          {isStandalonePanelOpen && (
            <div className="rounded-xl border bg-muted/20 p-4 shadow-sm">
              <div className="mb-4">
                <p className="font-semibold text-foreground">Trang Chat Độc Lập</p>
                <p className="text-sm text-muted-foreground">
                  Chia sẻ chatbot qua đường link công khai và mã QR.
                </p>
              </div>
              <StandaloneChatSharePanel
                botName={botName}
                avatarUrl={botAvatarUrl}
                slug={standaloneSlug}
                savedSlug={savedStandaloneSlug}
                isPublic={standaloneIsPublic}
                savedIsPublic={botQuery.data?.is_public ?? false}
                isSaving={isSavingStandalone}
                onSlugChange={setStandaloneSlug}
                onPublicChange={setStandaloneIsPublic}
                onSave={handleSaveStandaloneSettings}
                variant="dropdown"
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
