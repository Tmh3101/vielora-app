"use client";

import React from "react";
import { StandaloneChatSharePanel } from "@/components/dashboard/StandaloneChatSharePanel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, RefreshCw, Square, Copy, Plus, Trash2 } from "lucide-react";
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
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="flex flex-1 items-stretch overflow-hidden rounded-md border">
          <div className="flex items-center bg-muted px-3 py-2">
            <span className="whitespace-nowrap text-xs text-muted-foreground sm:text-sm">
              Bot ID :
            </span>
          </div>
          <Input value={bot.id} readOnly className="border-0 focus-visible:ring-0" />
        </div>
        <Button
          variant="outline"
          size="icon"
          aria-label="Sao chép Bot ID"
          className="shrink-0 hover:bg-primary"
          onClick={() => {
            navigator.clipboard.writeText(bot.id);
            toast({ title: "Đã sao chép Bot ID!" });
          }}
        >
          <Copy className="h-4 w-4" />
        </Button>
      </div>

      <Card className="glass">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardHeader>
            <CardTitle>Điều khiển Bot</CardTitle>
            <CardDescription>Khởi động hoặc dừng hoạt động của bot</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4 p-6">
            {bot.is_stopped ? (
              <Button variant="default" onClick={() => void onStartBot()} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang khởi động...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Khởi động Bot
                  </>
                )}
              </Button>
            ) : (
              bot.status !== "failed" && (
                <Button
                  variant="destructive"
                  onClick={() => setStopModalOpen(true)}
                  disabled={isStoppingBot}
                >
                  <Square className="mr-2 h-4 w-4" />
                  Dừng Bot
                </Button>
              )
            )}
          </CardContent>
        </div>
      </Card>

      <Card className="glass">
        <CardHeader>
          <CardTitle>Trang Chat Độc Lập</CardTitle>
          <CardDescription>Chia sẻ chatbot qua đường link công khai</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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

      <Card className="glass">
        <CardHeader>
          <CardTitle>Domain được phép</CardTitle>
          <CardDescription>
            Chỉ các domain trong danh sách này được phép hiển thị widget chatbot
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">
                {allowedDomains.filter((domain) => domain.trim()).length}/{MAX_ALLOWED_DOMAINS}
              </span>
            </div>

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
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Xóa domain"
                    disabled={isSavingAllowedDomains}
                    onClick={() => handleRemoveAllowedDomain(index)}
                    className="hover:border hover:border-destructive hover:bg-white hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            {allowedDomainsError ? (
              <p className="text-[0.8rem] text-destructive">{allowedDomainsError}</p>
            ) : null}

            <p className="text-[0.8rem] text-muted-foreground">
              Có thể nhập domain hoặc URL đầy đủ. Hệ thống sẽ tự chuẩn hóa về hostname. Domain cha
              không tự cho phép subdomain.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="outline"
              disabled={allowedDomains.length >= MAX_ALLOWED_DOMAINS || isSavingAllowedDomains}
              onClick={handleAddAllowedDomain}
              className="border-white bg-white hover:border hover:border-primary hover:bg-white hover:text-primary"
            >
              <Plus className="mr-1 h-4 w-4" />
              Thêm domain
            </Button>
            <Button
              onClick={() => void onSaveAllowedDomains()}
              disabled={isSavingAllowedDomains || !isAllowedDomainsFormValid}
            >
              {isSavingAllowedDomains && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Lưu thay đổi
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="glass">
        <CardHeader>
          <CardTitle>Giới hạn sử dụng</CardTitle>
          <CardDescription>
            Cấu hình giới hạn tin nhắn để kiểm soát chi phí và bảo vệ bot
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="rateLimitPerDay">Giới hạn tin nhắn / ngày</Label>
              <Input
                id="rateLimitPerDay"
                type="text"
                inputMode="numeric"
                pattern="[1-9][0-9]*"
                placeholder="Không giới hạn"
                value={rateLimitPerDay}
                onChange={(e) => handleRateLimitInputChange(e.target.value, setRateLimitPerDay)}
              />
              {rateLimitPerDayError ? (
                <p className="text-[0.8rem] text-destructive">{rateLimitPerDayError}</p>
              ) : null}
              <p className="text-[0.8rem] text-muted-foreground">
                Tổng số tin nhắn bot có thể trả lời trong một ngày. Để trống nếu không muốn giới
                hạn.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rateLimitPerIp">Giới hạn tin nhắn / IP / ngày</Label>
              <Input
                id="rateLimitPerIp"
                type="text"
                inputMode="numeric"
                pattern="[1-9][0-9]*"
                placeholder="Không giới hạn"
                value={rateLimitPerIp}
                onChange={(e) => handleRateLimitInputChange(e.target.value, setRateLimitPerIp)}
              />
              {rateLimitPerIpError ? (
                <p className="text-[0.8rem] text-destructive">{rateLimitPerIpError}</p>
              ) : null}
              <p className="text-[0.8rem] text-muted-foreground">
                Số tin nhắn tối đa từ một người dùng (IP) trong một ngày. Để trống nếu không muốn
                giới hạn.
              </p>
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <Button
              onClick={() => void onSaveRateLimit()}
              disabled={isSavingRateLimit || !isRateLimitFormValid}
            >
              {isSavingRateLimit && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Lưu thay đổi
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
