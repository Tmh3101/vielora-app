"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { BarChart3, Bot, Globe, Plus, Trash2 } from "lucide-react";
import type { Tables } from "@/lib/supabase/types";
import { EBotStatus } from "@/types";

type BotType = Tables<"bots">;

export interface BotsGridProps {
  bots: BotType[];
  indexedPagesByBot: Record<string, number>;
  getStatusColor: (status: string, isStopped: boolean) => string;
  getStatusText: (status: string, isStopped: boolean) => string;
  onCreateNew: () => void;
  onOpenBot: (botId: string) => void;
  onDeleteBot: (botId: string, botName: string) => Promise<void>;
}

export function BotsGrid({
  bots,
  indexedPagesByBot,
  getStatusColor,
  getStatusText,
  onCreateNew,
  onOpenBot,
  onDeleteBot,
}: BotsGridProps) {
  return (
    <section>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="heading-premium text-xl font-bold">Chatbots của bạn</h2>
          <p className="text-sm text-muted-foreground">Quản lý và theo dõi các chatbot</p>
        </div>
        <Button onClick={onCreateNew} className="bg-gradient-primary btn-glow shadow-glow-sm">
          <Plus className="mr-2 h-4 w-4" />
          Tạo chatbot mới
        </Button>
      </div>

      {bots.length === 0 ? (
        <Card className="glass-lg py-16 text-center">
          <CardContent>
            <div className="bg-gradient-primary/10 mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl">
              <Bot className="h-10 w-10 text-primary" />
            </div>
            <h3 className="mb-3 text-xl font-semibold">Chưa có chatbot nào</h3>
            <p className="mx-auto mb-6 max-w-sm text-muted-foreground">
              Tạo chatbot đầu tiên để bắt đầu hỗ trợ khách hàng tự động 24/7
            </p>
            <Button onClick={onCreateNew} className="bg-gradient-primary btn-glow">
              <Plus className="mr-2 h-4 w-4" />
              Tạo chatbot đầu tiên
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {bots.map((bot) => (
            <Card key={bot.id} className="card-bot group">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="group-hover:shadow-glow-sm h-12 w-12 rounded-2xl transition-shadow">
                      <AvatarImage
                        src={bot.avatar_url || undefined}
                        alt={bot.name}
                        className="object-cover"
                      />
                      <AvatarFallback className="bg-gradient-primary/10 rounded-2xl text-primary">
                        <Bot className="h-6 w-6" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">{bot.name}</CardTitle>
                      <CardDescription className="flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        {bot.domain}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="glass flex items-center gap-2 rounded-full px-2.5 py-1">
                    <span
                      className={`h-2 w-2 rounded-full ${getStatusColor(bot.status, bot.is_stopped)} ${bot.status === EBotStatus.Ready && !bot.is_stopped ? "animate-pulse" : ""}`}
                    />
                    <span className="text-xs text-muted-foreground">
                      {getStatusText(bot.status, bot.is_stopped)}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 rounded-xl bg-muted/30 p-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Trang đã index</p>
                    <p className="font-semibold text-foreground">
                      {indexedPagesByBot[bot.id] || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Crawl lần cuối</p>
                    <p className="font-semibold text-foreground">
                      {bot.last_crawl_at
                        ? new Date(bot.last_crawl_at).toLocaleDateString("vi-VN")
                        : "Chưa crawl"}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="bg-gradient-primary btn-glow shadow-glow-sm flex-1 text-primary-foreground"
                    onClick={() => onOpenBot(bot.id)}
                  >
                    <BarChart3 className="mr-1 h-4 w-4" />
                    Chi tiết
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:border-destructive/50 hover:bg-destructive/5 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="glass-lg">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Xóa chatbot?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Bạn có chắc muốn xóa chatbot &quot;{bot.name}&quot;? Tất cả dữ liệu liên
                          quan sẽ bị xóa vĩnh viễn.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="hover:bg-white hover:text-black">
                          Hủy
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => void onDeleteBot(bot.id, bot.name)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Xóa
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
