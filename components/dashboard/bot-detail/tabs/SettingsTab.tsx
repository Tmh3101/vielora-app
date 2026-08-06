"use client";

import React from "react";
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
} from "lucide-react";
import { MAX_ALLOWED_DOMAINS } from "@/lib/security/allowed-domains";
import type { Tables } from "@/lib/supabase/types";
import { useToast } from "@/hooks/use-toast";
import { useAppearanceStore } from "@/store/useAppearanceStore";
import { useBotDetailUIStore } from "@/store/useBotDetailUIStore";
import { parseRateLimitInput } from "@/lib/bot-rate-limit";
import { validateAllowedDomains } from "@/lib/security/allowed-domains";

type BotType = Tables<"bots">;

export interface SettingsTabProps {
  bot: BotType;
  onStartBot: () => Promise<void>;
  onSaveRateLimit: () => Promise<void>;
  onSaveAllowedDomains: () => Promise<void>;
  onSaveSlugSettings: () => Promise<void>;
}

export function SettingsTab({
  bot,
  onStartBot,
  onSaveRateLimit,
  onSaveAllowedDomains,
  onSaveSlugSettings,
}: SettingsTabProps) {
  const { toast } = useToast();

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

  const setStopModalOpen = useBotDetailUIStore((s) => s.setStopModalOpen);

  const rateLimitPerDayError = parseRateLimitInput(
    rateLimitPerDay,
    "Giới hạn tin nhắn / ngày"
  ).error;
  const rateLimitPerIpError = parseRateLimitInput(
    rateLimitPerIp,
    "Giới hạn tin nhắn / IP / ngày"
  ).error;
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
          aria-label="Sao chép Bot ID"
          className="h-10 w-10 shrink-0 rounded-xl border-border/40 bg-card/60 transition-all hover:border-primary/30 hover:bg-primary/10 hover:text-primary"
          onClick={() => {
            navigator.clipboard.writeText(bot.id);
            toast({ title: "Đã sao chép Bot ID!" });
          }}
        >
          <Copy className="h-4 w-4" />
        </Button>
      </div>

      {/* Điều khiển Bot */}
      <Card className="overflow-hidden rounded-2xl border border-border/40 bg-card/60 shadow-sm backdrop-blur-md transition-all hover:border-border/60">
        <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
              <Power className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">Trạng thái Bot</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Khởi động hoặc tạm dừng hoạt động phản hồi của chatbot
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
                    Đang kích hoạt...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Khởi động
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
                  <Square className="mr-2 h-4 w-4 fill-current" />
                  Tạm dừng
                </Button>
              )
            )}
          </div>
        </div>
      </Card>

      {/* Trang Chat Độc Lập */}
      <Card className="overflow-hidden rounded-2xl border border-border/40 bg-card/60 shadow-sm backdrop-blur-md transition-all hover:border-border/60">
        <CardHeader className="border-b border-border/40 bg-muted/20 p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
              <Share2 className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">Trang chat độc lập</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Chia sẻ chatbot qua đường link công khai trực tiếp
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

      {/* Domain được phép */}
      <Card className="overflow-hidden rounded-2xl border border-border/40 bg-card/60 shadow-sm backdrop-blur-md transition-all hover:border-border/60">
        <CardHeader className="border-b border-border/40 bg-muted/20 p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                <Globe className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">Domain được phép tích hợp</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Chỉ tên miền thuộc danh sách này mới có thể nạp và hiển thị Widget Chat
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
                    aria-label="Xóa domain"
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
              Nhập tên miền (vd: domain.com). Hệ thống sẽ tự động loại bỏ protocol http/https.
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
              Thêm domain
            </Button>
            <Button
              onClick={() => void onSaveAllowedDomains()}
              disabled={isSavingAllowedDomains || !isAllowedDomainsFormValid}
              className="shadow-xs rounded-xl font-semibold"
            >
              {isSavingAllowedDomains && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Lưu danh sách Domain
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Giới hạn sử dụng */}
      <Card className="overflow-hidden rounded-2xl border border-border/40 bg-card/60 shadow-sm backdrop-blur-md transition-all hover:border-border/60">
        <CardHeader className="border-b border-border/40 bg-muted/20 p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">Giới hạn tần suất</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Cấu hình giới hạn lượt phản hồi để kiểm soát dung lượng và tránh Spam
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-5 sm:p-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="rateLimitPerDay" className="text-xs font-medium">
                Giới hạn tin nhắn / ngày
              </Label>
              <Input
                id="rateLimitPerDay"
                type="text"
                inputMode="numeric"
                pattern="[1-9][0-9]*"
                placeholder="Không giới hạn"
                value={rateLimitPerDay}
                onChange={(e) => handleRateLimitInputChange(e.target.value, setRateLimitPerDay)}
                className="rounded-xl border-border/60 bg-background/50 text-sm focus-visible:ring-primary/20"
              />
              {rateLimitPerDayError ? (
                <p className="text-xs text-destructive">{rateLimitPerDayError}</p>
              ) : null}
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Tổng số tin nhắn bot có thể phản hồi trong ngày.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rateLimitPerIp" className="text-xs font-medium">
                Giới hạn tin nhắn / IP / ngày
              </Label>
              <Input
                id="rateLimitPerIp"
                type="text"
                inputMode="numeric"
                pattern="[1-9][0-9]*"
                placeholder="Không giới hạn"
                value={rateLimitPerIp}
                onChange={(e) => handleRateLimitInputChange(e.target.value, setRateLimitPerIp)}
                className="rounded-xl border-border/60 bg-background/50 text-sm focus-visible:ring-primary/20"
              />
              {rateLimitPerIpError ? (
                <p className="text-xs text-destructive">{rateLimitPerIpError}</p>
              ) : null}
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Số tin nhắn tối đa từ một IP người dùng trong ngày.
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
              Lưu cài đặt giới hạn
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
