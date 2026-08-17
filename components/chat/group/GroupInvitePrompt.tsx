"use client";

import Link from "next/link";
import Image from "next/image";
import { ShieldAlert, LogOut, MessageSquare, LogIn, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

interface GroupInvitePromptProps {
  userEmail?: string;
  botName?: string;
  botSlug?: string;
  onSwitchToAuth?: () => void;
}

export function GroupInvitePrompt({
  userEmail,
  botName = "Bot",
  botSlug,
  onSwitchToAuth,
}: GroupInvitePromptProps) {
  const supabase = createBrowserSupabaseClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    if (onSwitchToAuth) {
      onSwitchToAuth();
    } else {
      window.location.reload();
    }
  };

  const standaloneChatUrl = botSlug ? `/public-bot/${botSlug}` : "/";
  const groupPath =
    typeof window !== "undefined"
      ? window.location.pathname
      : botSlug
        ? `/public-bot/${botSlug}/group`
        : "/";
  const authUrl = `/auth?next=${encodeURIComponent(groupPath)}`;

  return (
    <div className="flex h-full min-h-[450px] items-center justify-center p-4 sm:p-6">
      <Card className="w-full max-w-lg border-border/60 shadow-lg backdrop-blur-md">
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col items-center space-y-6 py-2 text-center">
            {/* Logo */}
            <Link
              href="/"
              className="flex items-center justify-center transition-opacity hover:opacity-90"
            >
              <Image
                src="/images/logo-icon.png"
                alt="Vielora"
                width={80}
                height={80}
                className="h-16 w-16 sm:h-20 sm:w-20"
                priority
              />
            </Link>

            {/* Icon + Title inline */}
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-amber-500/10 dark:bg-amber-500/20">
                <ShieldAlert className="h-7 w-7 text-amber-500" />
              </div>
              <h2 className="text-xl font-semibold text-foreground">Yêu cầu Lời mời Tham gia</h2>
            </div>

            {/* Content info */}
            <div className="space-y-3 text-center">
              <p className="text-sm leading-relaxed text-muted-foreground">
                Nhóm chat trực tuyến của <strong>{botName}</strong> là nhóm riêng tư chỉ dành cho
                các thành viên được mời.
              </p>
              {userEmail ? (
                <div className="rounded-xl border border-border/60 bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">Tài khoản hiện tại của bạn:</p>
                  <p className="mt-0.5 break-all font-mono text-xs font-semibold text-foreground">
                    {userEmail}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Vui lòng đăng nhập tài khoản đã được mời hoặc liên hệ quản trị viên để nhận quyền
                  truy cập.
                </p>
              )}
            </div>

            {/* CTA Buttons */}
            <div className="flex w-full flex-col gap-3 pt-2 sm:flex-row">
              {userEmail ? (
                <Button
                  variant="outline"
                  onClick={handleSignOut}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border-border/70 text-xs font-semibold text-muted-foreground transition-all duration-200 hover:border-primary/40 hover:bg-primary/10 hover:text-primary active:scale-[0.98] sm:flex-1"
                >
                  <LogOut className="h-4 w-4" />
                  Chuyển đổi tài khoản
                </Button>
              ) : (
                <Button
                  variant="outline"
                  asChild
                  className="shadow-xs flex h-11 w-full items-center justify-center gap-2 rounded-xl border-border/80 bg-background text-xs font-semibold text-foreground transition-all duration-200 hover:border-primary/50 hover:bg-primary/10 hover:text-primary active:scale-[0.98] sm:flex-1"
                >
                  <Link href={authUrl}>
                    <LogIn className="h-4 w-4" />
                    Đăng nhập tài khoản
                  </Link>
                </Button>
              )}

              <Button
                asChild
                className="btn-glow flex h-11 w-full items-center justify-center gap-2 rounded-xl text-xs font-semibold shadow-md transition-all duration-200 active:scale-[0.98] sm:flex-1"
              >
                <Link href={standaloneChatUrl}>
                  <MessageSquare className="h-4 w-4" />
                  Về trang Chat AI
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>

            {/* Support footer */}
            <div className="w-full border-t border-border/60 pt-4 text-center">
              <p className="text-xs text-muted-foreground">
                Cần hỗ trợ?{" "}
                <a
                  href="mailto:contact@vielora.vn"
                  className="font-medium text-primary hover:underline"
                >
                  Liên hệ support
                </a>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
