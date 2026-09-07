"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowRight, FileText, Globe, Loader2 } from "lucide-react";
import { AvatarUpload } from "@/components/AvatarUpload";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useBotCreation } from "@/hooks/onboarding/useBotCreation";
import { useOnboardingStore } from "@/store/useOnboardingStore";
import { ONBOARDING_SOURCE_MODE, type OnboardingSourceMode } from "@/lib/constants";
import type { CrawlScopeType } from "@/types/scrape";
import { CrawlScope } from "@/lib/constants";
import { validateWebsiteUrl } from "@/lib/helpers";
import { EBotStatus } from "@/types";

export interface Step1CreateBotProps {
  userId: string;
  onNext: (botId: string, status?: EBotStatus) => void;
}

export function Step1CreateBot({ userId, onNext }: Step1CreateBotProps) {
  const t = useTranslations("onboarding.steps.step1");
  const router = useRouter();
  const { toast } = useToast();
  const { isCreating, createBotAndStartDiscover, createFileOnboardingBot } = useBotCreation();
  const crawlScope = useOnboardingStore((state) => state.crawlScope);
  const sourceMode = useOnboardingStore((state) => state.sourceMode);
  const setCrawlScope = useOnboardingStore((state) => state.setCrawlScope);
  const setSourceMode = useOnboardingStore((state) => state.setSourceMode);

  const [websiteUrl, setWebsiteUrl] = useState("");
  const [botName, setBotName] = useState("");
  const [botAvatar, setBotAvatar] = useState<{ url: string | null; file?: File }>({ url: null });
  const websiteUrlError = validateWebsiteUrl(websiteUrl).error;
  const isWebsiteMode = sourceMode === ONBOARDING_SOURCE_MODE.WEBSITE;

  const getSuggestedBotName = (urlInput: string): string | null => {
    if (!urlInput) return null;

    const validation = validateWebsiteUrl(urlInput);
    if (validation.error || !validation.hostname) return null;

    const domain = validation.hostname.replace(/^www\./, "");
    const name = domain.split(".")[0];
    return name.charAt(0).toUpperCase() + name.slice(1) + " Bot";
  };

  const handleCreateBot = async () => {
    if (!botName) return;
    if (isWebsiteMode && (!websiteUrl || websiteUrlError)) {
      toast({
        title: t("errorTitle"),
        description: websiteUrlError || t("errorUrlRequired"),
        variant: "destructive",
      });
      return;
    }

    try {
      if (isWebsiteMode) {
        const botId = await createBotAndStartDiscover({
          userId,
          websiteUrl,
          botName,
          botAvatar,
          includeSubdomains: crawlScope === CrawlScope.FULL_WEBSITE,
        });
        onNext(botId, EBotStatus.Discovering);
        return;
      }

      const botId = await createFileOnboardingBot({
        userId,
        botName,
        botAvatar,
      });
      onNext(botId, EBotStatus.Pending);
    } catch (error) {
      console.error("Error creating bot:", error);
      toast({
        title: t("errorTitle"),
        description: error instanceof Error ? error.message : t("errorCreateGeneric"),
        variant: "destructive",
      });
    }
  };

  const handleSourceModeChange = (value: string) => {
    setSourceMode(value as OnboardingSourceMode);
  };

  return (
    <Card className="mx-auto max-w-3xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isWebsiteMode ? (
            <Globe className="h-5 w-5 text-primary" />
          ) : (
            <FileText className="h-5 w-5 text-primary" />
          )}
          {t("title")}
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={sourceMode} onValueChange={handleSourceModeChange}>
          <TabsList className="grid w-full grid-cols-2 bg-muted/60">
            <TabsTrigger value={ONBOARDING_SOURCE_MODE.WEBSITE} disabled={isCreating}>
              <Globe className="mr-2 h-4 w-4" />
              {t("sourceWebsite")}
            </TabsTrigger>
            <TabsTrigger value={ONBOARDING_SOURCE_MODE.FILES} disabled={isCreating}>
              <FileText className="mr-2 h-4 w-4" />
              {t("sourceFiles")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value={ONBOARDING_SOURCE_MODE.WEBSITE} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="websiteUrl">
                {t("websiteUrlLabel")} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="websiteUrl"
                type="url"
                placeholder={t("websiteUrlPlaceholder")}
                value={websiteUrl}
                aria-invalid={!!websiteUrlError}
                disabled={isCreating}
                onChange={(e) => {
                  const nextUrl = e.target.value;
                  setWebsiteUrl(nextUrl);
                  const suggestedName = getSuggestedBotName(nextUrl);
                  if (suggestedName) {
                    setBotName(suggestedName);
                  }
                }}
              />
              {websiteUrlError && <p className="text-xs text-destructive">{websiteUrlError}</p>}
            </div>
          </TabsContent>
        </Tabs>

        <div className="grid items-start gap-6 sm:grid-cols-[auto_1fr]">
          <div className="flex flex-col items-center sm:items-start">
            <Label className="mb-2">{t("avatarLabel")}</Label>
            <AvatarUpload
              botName={botName || "Bot"}
              currentAvatarUrl={botAvatar.url}
              onAvatarChange={(url, file) => setBotAvatar({ url, file })}
              size="md"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="botName">
              {t("botNameLabel")} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="botName"
              type="text"
              placeholder={t("botNamePlaceholder")}
              value={botName}
              disabled={isCreating}
              onChange={(e) => setBotName(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">{t("botNameHint")}</p>
          </div>
        </div>

        {isWebsiteMode && (
          <div className="space-y-2">
            <Label>{t("scopeLabel")}</Label>
            <RadioGroup
              value={crawlScope}
              onValueChange={(value) => setCrawlScope(value as CrawlScopeType)}
              className="gap-3"
            >
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/40">
                <RadioGroupItem
                  value={CrawlScope.FULL_WEBSITE}
                  id="scope-full-website"
                  className="mt-0.5"
                />
                <span className="space-y-0.5">
                  <span className="block text-sm font-medium">{t("scopeFull")}</span>
                  <span className="block text-xs text-muted-foreground">{t("scopeFullDesc")}</span>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/40">
                <RadioGroupItem
                  value={CrawlScope.SUBDOMAIN_ONLY}
                  id="scope-subdomain-only"
                  className="mt-0.5"
                />
                <span className="space-y-0.5">
                  <span className="block text-sm font-medium">{t("scopeSubdomain")}</span>
                  <span className="block text-xs text-muted-foreground">
                    {t("scopeSubdomainDesc")}
                  </span>
                </span>
              </label>
            </RadioGroup>
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard")}
            className="hover:border-primary hover:bg-white hover:text-primary sm:min-w-[160px]"
          >
            {t("backToDashboard")}
          </Button>
          <Button
            onClick={handleCreateBot}
            disabled={
              !botName || (isWebsiteMode && (!websiteUrl || !!websiteUrlError)) || isCreating
            }
            className="sm:min-w-[160px]"
          >
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("creating")}
              </>
            ) : (
              <>
                {t("continue")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
