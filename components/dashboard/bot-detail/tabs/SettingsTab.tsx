"use client";

import React, { useState } from "react";
import { StandaloneChatSharePanel } from "@/components/dashboard/StandaloneChatSharePanel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  RefreshCw,
  Square,
  Copy,
  Plus,
  Trash2,
  Power,
  Globe,
  ShieldAlert,
  Share2,
  Key,
  Mic,
  FileDown,
  Languages,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { MAX_ALLOWED_DOMAINS } from "@/lib/security/allowed-domains";
import type { Tables } from "@/lib/supabase/types";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useAppearanceStore } from "@/store/useAppearanceStore";
import { useBotDetailUIStore } from "@/store/useBotDetailUIStore";
import { parseRateLimitInput } from "@/lib/bot-rate-limit";
import { validateAllowedDomains } from "@/lib/security/allowed-domains";
import { ExportReportButton } from "@/components/dashboard/bot-detail/ExportReportButton";
import { useWorkspace } from "@/hooks/useWorkspace";
import { ESubscriptionPlan } from "@/types/enums";
import { BOT_WIDGET_LANGUAGES } from "@/lib/constants";
import { useTranslations } from "next-intl";

type BotType = Tables<"bots">;

export interface SettingsTabProps {
  bot: BotType;
  onStartBot: () => Promise<void>;
  onSaveRateLimit: () => Promise<void>;
  onSaveAllowedDomains: () => Promise<void>;
  onSaveSlugSettings: () => Promise<void>;
  onSaveAppearance?: (overrides?: {
    isVoiceEnabled?: boolean;
    navigation_enabled?: boolean;
    ui_language?: string;
  }) => Promise<void>;
}

export function SettingsTab({
  bot,
  onStartBot,
  onSaveRateLimit,
  onSaveAllowedDomains,
  onSaveSlugSettings,
  onSaveAppearance,
}: SettingsTabProps) {
  const t = useTranslations("dashboard.botDetail.settingsTab");
  const tCommon = useTranslations("dashboard.common");
  const { toast } = useToast();
  const { activeWorkspace } = useWorkspace();

  const currentPlanCode = activeWorkspace?.plans?.code?.toLowerCase() || ESubscriptionPlan.Free;
  const isProOrEnterprise =
    currentPlanCode === ESubscriptionPlan.Pro || currentPlanCode === ESubscriptionPlan.Enterprise;
  const isNavigationPlan =
    currentPlanCode === ESubscriptionPlan.Standard ||
    currentPlanCode === ESubscriptionPlan.Pro ||
    currentPlanCode === ESubscriptionPlan.Enterprise;

  const isSaving = useAppearanceStore((s) => s.isSaving);
  const isSavingRateLimit = useAppearanceStore((s) => s.isSavingRateLimit);
  const isSavingSlugSettings = useAppearanceStore((s) => s.isSavingSlugSettings);
  const isSavingAllowedDomains = useAppearanceStore((s) => s.isSavingAllowedDomains);
  const isStoppingBot = useAppearanceStore((s) => s.isStoppingBot);

  const rateLimitPerDay = useAppearanceStore((s) => s.rateLimitPerDay);
  const setRateLimitPerDay = useAppearanceStore((s) => s.setRateLimitPerDay);
  const rateLimitPerIp = useAppearanceStore((s) => s.rateLimitPerIp);
  const setRateLimitPerIp = useAppearanceStore((s) => s.setRateLimitPerIp);

  const allowedDomains = useAppearanceStore((s) => s.allowedDomains);
  const setAllowedDomains = useAppearanceStore((s) => s.setAllowedDomains);

  const slug = useAppearanceStore((s) => s.slug);
  const setSlug = useAppearanceStore((s) => s.setSlug);
  const isPublic = useAppearanceStore((s) => s.isPublic);
  const setIsPublic = useAppearanceStore((s) => s.setIsPublic);
  const isVoiceEnabled = useAppearanceStore((s) => s.isVoiceEnabled);
  const setIsVoiceEnabled = useAppearanceStore((s) => s.setIsVoiceEnabled);
  const navigationEnabled = useAppearanceStore((s) => s.navigationEnabled);
  const setNavigationEnabled = useAppearanceStore((s) => s.setNavigationEnabled);

  const [uiLanguage, setUiLanguage] = useState<string>(
    (bot.widget_settings as { ui_language?: string })?.ui_language ?? "vi"
  );

  const setStopModalOpen = useBotDetailUIStore((s) => s.setStopModalOpen);

  const rateLimitPerDayError = parseRateLimitInput(
    rateLimitPerDay,
    t("rateLimitPerDayLabel")
  ).error;
  const rateLimitPerIpError = parseRateLimitInput(rateLimitPerIp, t("rateLimitPerIpLabel")).error;
  const allowedDomainsValidation = validateAllowedDomains(
    allowedDomains.map((d) => d.trim()).filter(Boolean)
  );
  const allowedDomainsError = allowedDomainsValidation.error;
  const isRateLimitFormValid = !rateLimitPerDayError && !rateLimitPerIpError;
  const isAllowedDomainsFormValid = !allowedDomainsError;

  const handleRateLimitInputChange = (nextValue: string, setValue: (value: string) => void) => {
    if (nextValue === "") {
      setValue("");
      return;
    }

    if (/^[1-9]\d*$/.test(nextValue)) {
      setValue(nextValue);
    }
  };

  const handleAllowedDomainChange = (index: number, value: string) => {
    setAllowedDomains(
      allowedDomains.map((domain, domainIndex) => (domainIndex === index ? value : domain))
    );
  };

  const handleAddAllowedDomain = () => {
    if (allowedDomains.length >= MAX_ALLOWED_DOMAINS) return;
    setAllowedDomains([...allowedDomains, ""]);
  };

  const handleRemoveAllowedDomain = (index: number) => {
    setAllowedDomains(allowedDomains.filter((_, domainIndex) => domainIndex !== index));
  };

  return (
    <div className="space-y-6">
      {/* Bot ID bar */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="shadow-xs flex flex-1 items-stretch overflow-hidden rounded-xl border border-border/40 bg-card/60 backdrop-blur-md">
          <div className="flex items-center border-r border-border/40 bg-muted/40 px-3.5 py-2.5">
            <Key className="mr-2 h-4 w-4 text-primary" />
            <span className="whitespace-nowrap text-xs font-medium text-muted-foreground">
              Bot ID
            </span>
          </div>
          <Input
            value={bot.id}
            readOnly
            className="border-0 bg-transparent font-mono text-xs focus-visible:ring-0"
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          aria-label={t("copyBotIdAriaLabel")}
          className="h-10 w-10 shrink-0 rounded-xl border-border/40 bg-card/60 transition-all hover:border-primary/30 hover:bg-primary/10 hover:text-primary"
          onClick={() => {
            navigator.clipboard.writeText(bot.id);
            toast({ title: t("botIdCopied") });
          }}
        >
          <Copy className="h-4 w-4" />
        </Button>
      </div>

      {/* Bot Controls */}
      <Card className="overflow-hidden rounded-2xl border border-border/40 bg-card/60 shadow-sm backdrop-blur-md transition-all hover:border-border/60">
        <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
              <Power className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">{t("generalSettings")}</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                {t("stopBot")} / {t("startBot")}
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            {bot.is_stopped ? (
              <Button
                variant="default"
                onClick={() => void onStartBot()}
                disabled={isSaving}
                className="shadow-xs rounded-xl px-5 font-semibold"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {tCommon("loading")}
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    {t("startBot")}
                  </>
                )}
              </Button>
            ) : (
              bot.status !== "failed" && (
                <Button
                  variant="destructive"
                  onClick={() => setStopModalOpen(true)}
                  disabled={isStoppingBot}
                  className="shadow-xs rounded-xl px-5 font-semibold"
                >
                  <Square className="h-4 w-4 fill-current" />
                  {t("stopBot")}
                </Button>
              )
            )}
          </div>
        </div>
      </Card>

      {/* Widget Language - FREE for all plans (không cần gói trả phí) */}
      <Card className="overflow-hidden rounded-2xl border border-border/40 bg-card/60 shadow-sm backdrop-blur-md transition-all hover:border-border/60">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-center gap-3">
            <div className="shadow-xs flex h-9 w-9 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
              <Languages className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold tracking-tight">
                {t("widgetLanguageTitle")}
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                {t("widgetLanguageDesc")}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="shadow-xs inline-flex items-center rounded-xl border border-border/50 bg-muted/30 p-1 backdrop-blur-md">
              {BOT_WIDGET_LANGUAGES.map((item) => {
                const isSelected = uiLanguage === item.value;
                return (
                  <button
                    key={item.value}
                    type="button"
                    disabled={isSaving}
                    onClick={() => {
                      setUiLanguage(item.value);
                      if (onSaveAppearance) void onSaveAppearance({ ui_language: item.value });
                    }}
                    className={cn(
                      "relative flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 active:scale-95 disabled:opacity-50",
                      isSelected
                        ? "shadow-xs border border-border/60 bg-background text-foreground ring-1 ring-primary/20"
                        : "text-muted-foreground hover:bg-background/40 hover:text-foreground"
                    )}
                  >
                    <span className="text-sm leading-none">{item.flag}</span>
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
            {isSaving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
        </div>
      </Card>

      {/* Export Bot Report (Pro and Enterprise only) */}
      {isProOrEnterprise && (
        <Card className="overflow-hidden rounded-2xl border border-border/40 bg-card/60 shadow-sm backdrop-blur-md transition-all hover:border-border/60">
          <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                <FileDown className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">{t("exportReportTitle")}</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  {t("exportReportDesc")}
                </CardDescription>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <ExportReportButton
                botId={bot.id}
                workspaceId={bot.workspace_id}
                botUserId={bot.user_id}
              />
            </div>
          </div>
        </Card>
      )}

      {/* Chatbot Features (Paid plans only) */}
      {isNavigationPlan && (
        <Card className="overflow-hidden rounded-2xl border border-border/40 bg-card/60 shadow-sm backdrop-blur-md transition-all hover:border-border/60">
          <CardHeader className="border-b border-border/40 bg-muted/20 p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                <Mic className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">
                  {t("chatbotFeaturesTitle")}
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  {t("chatbotFeaturesDesc")}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <Label
                  htmlFor="voice-chat-switch"
                  className="cursor-pointer text-sm font-medium leading-none"
                >
                  {t("voiceChatLabel")}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {isVoiceEnabled ? t("voiceChatEnabled") : t("voiceChatDisabled")}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  id="voice-chat-switch"
                  checked={isVoiceEnabled}
                  disabled={isSaving}
                  onCheckedChange={(checked) => {
                    setIsVoiceEnabled(checked);
                    if (onSaveAppearance) {
                      void onSaveAppearance({ isVoiceEnabled: checked });
                    }
                  }}
                />
                {isSaving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Smart Navigation (Standard/Pro/Enterprise only) */}
      {isNavigationPlan && (
        <Card className="overflow-hidden rounded-2xl border border-border/40 bg-card/60 shadow-sm backdrop-blur-md transition-all hover:border-border/60">
          <CardHeader className="border-b border-border/40 bg-muted/20 p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                <Globe className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">{t("smartNavTitle")}</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  {t("smartNavDesc")}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <Label
                  htmlFor="navigation-switch"
                  className="cursor-pointer text-sm font-medium leading-none"
                >
                  {t("smartNavLabel")}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {navigationEnabled ? t("smartNavEnabled") : t("smartNavDisabled")}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  id="navigation-switch"
                  checked={navigationEnabled}
                  disabled={isSaving}
                  onCheckedChange={(checked) => {
                    setNavigationEnabled(checked);
                    if (onSaveAppearance) void onSaveAppearance({ navigation_enabled: checked });
                  }}
                />
                {isSaving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Standalone Chat Page */}
      <Card className="overflow-hidden rounded-2xl border border-border/40 bg-card/60 shadow-sm backdrop-blur-md transition-all hover:border-border/60">
        <CardHeader className="border-b border-border/40 bg-muted/20 p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
              <Share2 className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">{t("standaloneTitle")}</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                {t("standaloneDesc")}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-5 sm:p-6">
          <StandaloneChatSharePanel
            botName={bot.name}
            avatarUrl={bot.avatar_url}
            slug={slug}
            savedSlug={bot.slug}
            isPublic={isPublic}
            savedIsPublic={bot.is_public}
            isSaving={isSavingSlugSettings}
            onSlugChange={setSlug}
            onPublicChange={setIsPublic}
            onSave={onSaveSlugSettings}
          />
        </CardContent>
      </Card>

      {/* Allowed Domains */}
      <Card className="overflow-hidden rounded-2xl border border-border/40 bg-card/60 shadow-sm backdrop-blur-md transition-all hover:border-border/60">
        <CardHeader className="border-b border-border/40 bg-muted/20 p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                <Globe className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">
                  {t("allowedDomainsTitle")}
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  {t("allowedDomainsDesc")}
                </CardDescription>
              </div>
            </div>
            <span className="rounded-lg border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
              {allowedDomains.filter((domain) => domain.trim()).length}/{MAX_ALLOWED_DOMAINS}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-5 sm:p-6">
          <div className="space-y-3">
            <div className="space-y-2">
              {allowedDomains.map((domain, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    type="text"
                    inputMode="url"
                    placeholder="example.com"
                    value={domain}
                    aria-invalid={!!allowedDomainsError}
                    onChange={(e) => handleAllowedDomainChange(index, e.target.value)}
                    className="rounded-xl border-border/60 bg-background/50 text-sm focus-visible:ring-primary/20"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label={t("removeDomainAriaLabel")}
                    disabled={isSavingAllowedDomains}
                    onClick={() => handleRemoveAllowedDomain(index)}
                    className="h-10 w-10 shrink-0 rounded-xl border-border/60 bg-background/50 transition-all hover:border-destructive/60 hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            {allowedDomainsError ? (
              <p className="text-xs text-destructive">{allowedDomainsError}</p>
            ) : null}

            <p className="text-[11px] leading-relaxed text-muted-foreground">
              {t("allowedDomainsHint")}
            </p>
          </div>

          <div className="flex flex-col gap-2 border-t border-border/40 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={allowedDomains.length >= MAX_ALLOWED_DOMAINS || isSavingAllowedDomains}
              onClick={handleAddAllowedDomain}
              className="rounded-xl border-border/60 bg-background/50 text-xs font-medium transition-all hover:border-primary/40 hover:bg-primary/10 hover:text-primary active:scale-[0.98] disabled:opacity-50"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              {t("addDomain")}
            </Button>
            <Button
              onClick={() => void onSaveAllowedDomains()}
              disabled={isSavingAllowedDomains || !isAllowedDomainsFormValid}
              className="shadow-xs rounded-xl font-semibold"
            >
              {isSavingAllowedDomains && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("saveDomains")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Rate Limits */}
      <Card className="overflow-hidden rounded-2xl border border-border/40 bg-card/60 shadow-sm backdrop-blur-md transition-all hover:border-border/60">
        <CardHeader className="border-b border-border/40 bg-muted/20 p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">{t("rateLimitTitle")}</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                {t("rateLimitDesc")}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-5 sm:p-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="rateLimitPerDay" className="text-xs font-medium">
                {t("rateLimitPerDayLabel")}
              </Label>
              <Input
                id="rateLimitPerDay"
                type="text"
                inputMode="numeric"
                pattern="[1-9][0-9]*"
                placeholder={t("unlimitedPlaceholder")}
                value={rateLimitPerDay}
                onChange={(e) => handleRateLimitInputChange(e.target.value, setRateLimitPerDay)}
                className="rounded-xl border-border/60 bg-background/50 text-sm focus-visible:ring-primary/20"
              />
              {rateLimitPerDayError ? (
                <p className="text-xs text-destructive">{rateLimitPerDayError}</p>
              ) : null}
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                {t("rateLimitPerDayHint")}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rateLimitPerIp" className="text-xs font-medium">
                {t("rateLimitPerIpLabel")}
              </Label>
              <Input
                id="rateLimitPerIp"
                type="text"
                inputMode="numeric"
                pattern="[1-9][0-9]*"
                placeholder={t("unlimitedPlaceholder")}
                value={rateLimitPerIp}
                onChange={(e) => handleRateLimitInputChange(e.target.value, setRateLimitPerIp)}
                className="rounded-xl border-border/60 bg-background/50 text-sm focus-visible:ring-primary/20"
              />
              {rateLimitPerIpError ? (
                <p className="text-xs text-destructive">{rateLimitPerIpError}</p>
              ) : null}
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                {t("rateLimitPerIpHint")}
              </p>
            </div>
          </div>
          <div className="flex justify-end border-t border-border/40 pt-4">
            <Button
              onClick={() => void onSaveRateLimit()}
              disabled={isSavingRateLimit || !isRateLimitFormValid}
              className="shadow-xs rounded-xl font-semibold"
            >
              {isSavingRateLimit && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("saveRateLimit")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
