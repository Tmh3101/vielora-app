"use client";

// import DomainVerification from "@/components/bot/DomainVerification";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, RefreshCw, Square } from "lucide-react";
import type { Tables } from "@/lib/supabase/types";

type BotType = Tables<"bots">;

export interface SettingsTabProps {
  bot: BotType;
  isSaving: boolean;
  isStoppingBot: boolean;
  rateLimitPerDay: string;
  rateLimitPerIp: string;
  setRateLimitPerDay: (value: string) => void;
  setRateLimitPerIp: (value: string) => void;
  setStopModalOpen: (open: boolean) => void;
  onStartBot: () => Promise<void>;
  onSaveRateLimit: () => Promise<void>;
  onVerified: () => Promise<void>;
}

export function SettingsTab({
  bot,
  isSaving,
  isStoppingBot,
  rateLimitPerDay,
  rateLimitPerIp,
  setRateLimitPerDay,
  setRateLimitPerIp,
  setStopModalOpen,
  onStartBot,
  onSaveRateLimit,
  // onVerified,
}: SettingsTabProps) {
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
