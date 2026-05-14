"use client";

import { useMemo } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Bot, CheckCircle } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EPageStatus } from "@/types";
import {
  ONBOARDING_SUCCESS_BOT_KEY,
  ONBOARDING_SUCCESS_INDEXED_COUNT_KEY,
} from "@/lib/constants/react-query-key";

export interface Step4SuccessProps {
  botId: string;
}

interface BotInfo {
  name: string;
  avatar_url: string | null;
}

export function Step4Success({ botId }: Step4SuccessProps) {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const botQuery = useQuery({
    queryKey: [ONBOARDING_SUCCESS_BOT_KEY, botId],
    queryFn: async (): Promise<BotInfo | null> => {
      const { data, error } = await supabase
        .from("bots")
        .select("name, avatar_url")
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

  const botName = botQuery.data?.name ?? "Chatbot";
  const botAvatarUrl = botQuery.data?.avatar_url ?? null;
  const pagesIndexed = indexedCountQuery.data ?? 0;

  return (
    <Card className="mx-auto max-w-3xl">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <CardTitle>Chatbot đã sẵn sàng!</CardTitle>
        <CardDescription>
          Bot đã học xong {pagesIndexed} {pagesIndexed === 1 ? "trang" : "trang"} từ website của bạn
        </CardDescription>
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
              {pagesIndexed} trang
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard")}
            className="hover:border-primary hover:bg-white hover:text-primary"
          >
            Trở về Dashboard
          </Button>
          <Button onClick={() => router.push(`/dashboard/bots/${botId}`)}>
            Cài đặt Widget
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
