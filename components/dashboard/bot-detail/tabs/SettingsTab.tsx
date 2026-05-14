"use client";

// import DomainVerification from "@/components/bot/DomainVerification";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, RefreshCw, Square, Copy, AlertCircle } from "lucide-react";
import type { Tables } from "@/lib/supabase/types";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

type BotType = Tables<"bots">;

export interface SettingsTabProps {
  bot: BotType;
  isSaving: boolean;
  isStoppingBot: boolean;
  rateLimitPerDay: string;
  rateLimitPerIp: string;
  slug: string;
  isPublic: boolean;
  setRateLimitPerDay: (value: string) => void;
  setRateLimitPerIp: (value: string) => void;
  setSlug: (value: string) => void;
  setIsPublic: (value: boolean) => void;
  setStopModalOpen: (open: boolean) => void;
  onStartBot: () => Promise<void>;
  onSaveRateLimit: () => Promise<void>;
  onSaveSlugSettings: () => Promise<void>;
  onVerified: () => Promise<void>;
}

export function SettingsTab({
  bot,
  isSaving,
  isStoppingBot,
  rateLimitPerDay,
  rateLimitPerIp,
  slug,
  isPublic,
  setRateLimitPerDay,
  setRateLimitPerIp,
  setSlug,
  setIsPublic,
  setStopModalOpen,
  onStartBot,
  onSaveRateLimit,
  onSaveSlugSettings,
  // onVerified,
}: SettingsTabProps) {
  const { toast } = useToast();
  const [slugError, setSlugError] = useState<string>("");
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);

  // Validate slug format
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

    setSlugError("");
  }, [slug]);

  // Check for duplicate slug
  const checkSlugAvailability = async () => {
    if (!slug || slugError || slug === bot.slug) return;

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

  const handleSlugBlur = () => {
    void checkSlugAvailability();
  };

  const handleSaveSlug = async () => {
    if (slugError) {
      toast({
        title: "Lỗi",
        description: slugError,
        variant: "destructive",
      });
      return;
    }
    await onSaveSlugSettings();
  };

  return (
    <div className="space-y-6">
      <Card className="glass">
        <CardHeader>
          <CardTitle>Điều khiển Bot</CardTitle>
          <CardDescription>Khởi động hoặc dừng hoạt động của bot</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
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
      </Card>

      <Card className="glass">
        <CardHeader>
          <CardTitle>Trang Chat Độc Lập</CardTitle>
          <CardDescription>Chia sẻ chatbot qua đường link công khai</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Trạng thái công khai</Label>
              <p className="text-sm text-muted-foreground">
                Cho phép mọi người truy cập bot qua link
              </p>
            </div>
            <Switch checked={isPublic} onCheckedChange={setIsPublic} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">Đường link tùy chỉnh</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="flex flex-1 items-stretch overflow-hidden rounded-md border">
                <div className="flex items-center bg-muted px-3 py-2">
                  <span className="whitespace-nowrap text-xs text-muted-foreground sm:text-sm">
                    {process.env.NEXT_PUBLIC_APP_URL
                      ? new URL(process.env.NEXT_PUBLIC_APP_URL).hostname
                      : "localhost"}
                    /chat/
                  </span>
                </div>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  onBlur={handleSlugBlur}
                  placeholder="my-business"
                  className="border-0 focus-visible:ring-0"
                  disabled={isCheckingSlug}
                />
              </div>
              {slug && isPublic && !slugError && (
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0 hover:bg-primary"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `${process.env.NEXT_PUBLIC_APP_URL}/chat/${slug}`
                    );
                    toast({ title: "Đã sao chép link!" });
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              )}
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
            onClick={() => void handleSaveSlug()}
            disabled={isSaving || isCheckingSlug || !!slugError}
          >
            {(isSaving || isCheckingSlug) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Lưu cài đặt
          </Button>

          {slug && isPublic && !slugError && (
            <div className="rounded-md bg-blue-50 p-3">
              <p className="text-sm font-medium text-blue-900">Link công khai của bạn:</p>
              <a
                href={`${process.env.NEXT_PUBLIC_APP_URL}/chat/${slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all text-sm text-blue-600 hover:underline"
              >
                {process.env.NEXT_PUBLIC_APP_URL}/chat/{slug}
              </a>
            </div>
          )}
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
                type="number"
                placeholder="Không giới hạn"
                value={rateLimitPerDay}
                onChange={(e) => setRateLimitPerDay(e.target.value)}
              />
              <p className="text-[0.8rem] text-muted-foreground">
                Tổng số tin nhắn bot có thể trả lời trong một ngày. Để trống nếu không muốn giới
                hạn.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rateLimitPerIp">Giới hạn tin nhắn / IP / ngày</Label>
              <Input
                id="rateLimitPerIp"
                type="number"
                placeholder="Không giới hạn"
                value={rateLimitPerIp}
                onChange={(e) => setRateLimitPerIp(e.target.value)}
              />
              <p className="text-[0.8rem] text-muted-foreground">
                Số tin nhắn tối đa từ một người dùng (IP) trong một ngày. Để trống nếu không muốn
                giới hạn.
              </p>
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={() => void onSaveRateLimit()} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Lưu thay đổi
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* <DomainVerification botId={bot.id} verifiedAt={bot.verified_at} onVerified={onVerified} /> */}
    </div>
  );
}
