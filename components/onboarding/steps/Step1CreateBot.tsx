"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Globe, Loader2 } from "lucide-react";
import { AvatarUpload } from "@/components/AvatarUpload";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useBotCreation } from "@/hooks/onboarding/useBotCreation";

export interface Step1CreateBotProps {
  userId: string;
  onNext: (botId: string) => void;
}

export function Step1CreateBot({ userId, onNext }: Step1CreateBotProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { isCreating, createBotAndStartDiscover } = useBotCreation();

  const [websiteUrl, setWebsiteUrl] = useState("");
  const [botName, setBotName] = useState("");
  const [botAvatar, setBotAvatar] = useState<{ url: string | null; file?: File }>({ url: null });

  const getSuggestedBotName = (urlInput: string): string | null => {
    if (!urlInput) return null;

    try {
      const url = new URL(urlInput.startsWith("http") ? urlInput : `https://${urlInput}`);
      const domain = url.hostname.replace("www.", "");
      const name = domain.split(".")[0];
      return name.charAt(0).toUpperCase() + name.slice(1) + " Bot";
    } catch {
      return null;
    }
  };

  const handleCreateBot = async () => {
    if (!websiteUrl || !botName) return;

    try {
      const botId = await createBotAndStartDiscover({
        userId,
        websiteUrl,
        botName,
        botAvatar,
      });
      onNext(botId);
    } catch (error) {
      console.error("Error creating bot:", error);
      toast({
        title: "Lỗi",
        description: "Không thể tạo bot. Vui lòng thử lại.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="mx-auto max-w-3xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          Nhập website của bạn
        </CardTitle>
        <CardDescription>AI sẽ tự động crawl và học nội dung từ website</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="websiteUrl">Website URL</Label>
          <Input
            id="websiteUrl"
            type="url"
            placeholder="https://example.com"
            value={websiteUrl}
            onChange={(e) => {
              const nextUrl = e.target.value;
              setWebsiteUrl(nextUrl);
              const suggestedName = getSuggestedBotName(nextUrl);
              if (suggestedName) {
                setBotName(suggestedName);
              }
            }}
          />
        </div>

        <div className="grid items-start gap-6 sm:grid-cols-[auto_1fr]">
          <div className="flex flex-col items-center sm:items-start">
            <Label className="mb-2">Avatar (tuỳ chọn)</Label>
            <AvatarUpload
              botName={botName || "Bot"}
              currentAvatarUrl={botAvatar.url}
              onAvatarChange={(url, file) => setBotAvatar({ url, file })}
              size="md"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="botName">Tên chatbot</Label>
            <Input
              id="botName"
              type="text"
              placeholder="My Bot"
              value={botName}
              onChange={(e) => setBotName(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Tên này sẽ hiển thị trong widget chat</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard")}
            className="hover:border-primary hover:bg-white hover:text-primary sm:min-w-[160px]"
          >
            Về Dashboard
          </Button>
          <Button
            onClick={handleCreateBot}
            disabled={!websiteUrl || !botName || isCreating}
            className="sm:min-w-[160px]"
          >
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang tạo...
              </>
            ) : (
              <>
                Tiếp tục
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
