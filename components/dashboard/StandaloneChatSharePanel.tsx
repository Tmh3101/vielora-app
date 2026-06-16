"use client";

import React, { useEffect, useId, useState } from "react";
import { AlertCircle, Copy, ExternalLink, Loader2, QrCode } from "lucide-react";
import { StandaloneChatPageQRCode } from "@/components/dashboard/StandaloneChatPageQRCode";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { RESERVED_SUBDOMAINS } from "@/config";
import {
  getStandaloneChatAppUrl,
  getStandaloneChatUrlParts,
} from "@/lib/utils/standalone-chat-url";

export interface StandaloneChatSharePanelProps {
  botName: string;
  avatarUrl: string | null;
  slug: string;
  savedSlug: string | null;
  isPublic: boolean;
  savedIsPublic: boolean;
  isSaving: boolean;
  onSlugChange: (value: string) => void;
  onPublicChange: (value: boolean) => void;
  onSave: () => Promise<void>;
  className?: string;
  variant?: "default" | "dropdown";
}

export function StandaloneChatSharePanel({
  botName,
  avatarUrl,
  slug,
  savedSlug,
  isPublic,
  savedIsPublic,
  isSaving,
  onSlugChange,
  onPublicChange,
  onSave,
  className,
  variant = "default",
}: StandaloneChatSharePanelProps) {
  const { toast } = useToast();
  const slugInputId = useId();
  const [slugError, setSlugError] = useState<string>("");
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);

  const appUrl = getStandaloneChatAppUrl();
  const standaloneUrlParts = getStandaloneChatUrlParts(appUrl, slug);
  const standaloneUrl = standaloneUrlParts.href;
  const savedStandaloneUrl = getStandaloneChatUrlParts(appUrl, savedSlug ?? "").href;
  const canShareStandalone = Boolean(slug && isPublic && !slugError);
  const canShowShareActions = Boolean(slug && !slugError);
  const canPreviewSavedStandalone = Boolean(
    savedSlug && slug === savedSlug && isPublic && savedIsPublic && !slugError
  );
  const isDropdown = variant === "dropdown";

  useEffect(() => {
    if (!slug) {
      setSlugError("");
      return;
    }

    if (!/^[a-z0-9-]+$/.test(slug)) {
      setSlugError("Chỉ được sử dụng chữ thường, số và dấu gạch ngang");
      return;
    }

    if (slug.length < 3) {
      setSlugError("Slug phải có ít nhất 3 ký tự");
      return;
    }

    if (RESERVED_SUBDOMAINS.includes(slug.toLowerCase() as (typeof RESERVED_SUBDOMAINS)[number])) {
      setSlugError("Tên miền/slug này dành riêng cho hệ thống. Vui lòng chọn tên khác.");
      return;
    }

    setSlugError("");
  }, [slug]);

  const checkSlugAvailability = async () => {
    if (!slug || slugError || slug === savedSlug) return;

    setIsCheckingSlug(true);
    try {
      const response = await fetch(`/api/bots/check-slug?slug=${encodeURIComponent(slug)}`);
      const data = await response.json();

      if (!data.available) {
        setSlugError("Slug này đã được sử dụng. Vui lòng chọn slug khác.");
      }
    } catch (error) {
      console.error("Error checking slug:", error);
    } finally {
      setIsCheckingSlug(false);
    }
  };

  const handleSave = async () => {
    if (slugError) {
      toast({
        title: "Lỗi",
        description: slugError,
        variant: "destructive",
      });
      return;
    }

    await onSave();
  };

  const handleCopyLink = async () => {
    if (!canShareStandalone) return;

    await navigator.clipboard.writeText(standaloneUrl);
    toast({ title: "Đã sao chép link!" });
  };

  return (
    <div className={cn(isDropdown ? "space-y-3" : "space-y-4", className)}>
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label>Cho phép mọi người truy cập bot qua link</Label>
        </div>
        <Switch checked={isPublic} onCheckedChange={onPublicChange} />
      </div>

      <div className="space-y-2">
        <Label htmlFor={slugInputId}>Đường link tùy chỉnh</Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="flex flex-1 items-stretch overflow-hidden rounded-md border">
            <div className="flex items-center bg-muted px-3 py-2">
              <span className="whitespace-nowrap text-xs text-muted-foreground sm:text-sm">
                {standaloneUrlParts.prefix}
              </span>
            </div>
            <Input
              id={slugInputId}
              value={slug}
              onChange={(event) =>
                onSlugChange(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
              }
              onBlur={() => void checkSlugAvailability()}
              placeholder="my-business"
              className="border-0 focus-visible:ring-0"
              disabled={isCheckingSlug}
            />
            {standaloneUrlParts.suffix && (
              <div className="flex items-center bg-muted px-3 py-2">
                <span className="whitespace-nowrap text-xs text-muted-foreground sm:text-sm">
                  {standaloneUrlParts.suffix}
                </span>
              </div>
            )}
          </div>
          <div className="flex shrink-0 gap-2">
            <Button
              variant="outline"
              size="icon"
              aria-label="Mở trang chat công khai"
              className={cn(
                "shrink-0",
                canPreviewSavedStandalone
                  ? "hover:border-primary hover:bg-white hover:text-primary"
                  : "opacity-50"
              )}
              disabled={!canPreviewSavedStandalone}
              asChild={canPreviewSavedStandalone}
            >
              {canPreviewSavedStandalone ? (
                <a href={savedStandaloneUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              ) : (
                <ExternalLink className="h-4 w-4" />
              )}
            </Button>
            {canShowShareActions && (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Sao chép link chat"
                  className="shrink-0 hover:border-primary hover:bg-white hover:text-primary"
                  disabled={!canShareStandalone}
                  onClick={() => void handleCopyLink()}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label="Hiển thị mã QR"
                      className="shrink-0 hover:border-primary hover:bg-white hover:text-primary"
                      disabled={!canShareStandalone}
                    >
                      <QrCode className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[360px]">
                    <DialogHeader>
                      <DialogTitle>Mã QR trang chat</DialogTitle>
                    </DialogHeader>
                    <StandaloneChatPageQRCode
                      url={standaloneUrl}
                      avatarUrl={avatarUrl}
                      botName={botName}
                    />
                  </DialogContent>
                </Dialog>
              </>
            )}
          </div>
        </div>

        {slugError ? (
          <div className="flex items-center gap-1 text-xs text-destructive">
            <AlertCircle className="h-3 w-3" />
            <span>{slugError}</span>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Chỉ chữ thường, số và dấu gạch ngang (tối thiểu 3 ký tự)
          </p>
        )}
      </div>

      <Button
        onClick={() => void handleSave()}
        disabled={isSaving || isCheckingSlug || !!slugError}
        className={cn(isDropdown && "w-full")}
      >
        {(isSaving || isCheckingSlug) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Lưu cài đặt
      </Button>
    </div>
  );
}
