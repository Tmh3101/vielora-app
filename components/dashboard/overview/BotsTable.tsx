"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { BarChart3, Bot, Check, Copy, Globe, Trash2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import type { Tables } from "@/lib/supabase/types";
import { EBotStatus } from "@/types";

type BotType = Tables<"bots">;

export interface BotsTableProps {
  bots: BotType[];
  indexedPagesByBot: Record<string, number>;
  getStatusColor: (status: string, isStopped: boolean) => string;
  getStatusText: (status: string, isStopped: boolean) => string;
  onOpenBot: (botId: string) => void;
  onDeleteBot: (botId: string, botName: string) => Promise<void>;
}

export function BotsTable({
  bots,
  indexedPagesByBot,
  getStatusColor,
  getStatusText,
  onOpenBot,
  onDeleteBot,
}: BotsTableProps) {
  const [copiedBotId, setCopiedBotId] = useState<string | null>(null);

  const handleCopyBotId = async (botId: string) => {
    try {
      await navigator.clipboard.writeText(botId);
      setCopiedBotId(botId);
      toast.success("Đã copy Bot ID");
      window.setTimeout(() => {
        setCopiedBotId((current) => (current === botId ? null : current));
      }, 1600);
    } catch (error) {
      console.error("Copy bot id failed:", error);
      toast.error("Không thể copy Bot ID. Vui lòng thử lại.");
    }
  };

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Chatbot</TableHead>
            <TableHead>Domain</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead className="text-center">Trang đã index</TableHead>
            <TableHead>Crawl lần cuối</TableHead>
            <TableHead className="text-right">Thao tác</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bots.map((bot) => (
            <TableRow
              key={bot.id}
              className="cursor-pointer transition-colors hover:bg-muted/50"
              onClick={() => onOpenBot(bot.id)}
            >
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9 rounded-xl">
                    <AvatarImage
                      src={bot.avatar_url || undefined}
                      alt={bot.name}
                      className="object-cover"
                    />
                    <AvatarFallback className="bg-gradient-primary/10 rounded-xl text-primary">
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium leading-tight">{bot.name}</p>
                    {bot.is_banned && (
                      <span className="flex items-center gap-1 text-[10px] font-medium text-destructive">
                        <ShieldAlert className="h-3 w-3" />
                        Bị chặn
                      </span>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Globe className="h-3.5 w-3.5" />
                  {bot.domain}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="inline-flex items-center gap-1.5">
                  <span
                    className={`h-2 w-2 rounded-full ${getStatusColor(bot.status, bot.is_stopped)} ${bot.status === EBotStatus.Ready && !bot.is_stopped ? "animate-pulse" : ""}`}
                  />
                  {getStatusText(bot.status, bot.is_stopped)}
                </Badge>
              </TableCell>
              <TableCell className="text-center text-sm font-medium">
                {indexedPagesByBot[bot.id] || 0}
              </TableCell>
              <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                {bot.last_crawl_at
                  ? new Date(bot.last_crawl_at).toLocaleDateString("vi-VN")
                  : "Chưa crawl"}
              </TableCell>
              <TableCell className="text-right">
                <div
                  className="flex items-center justify-end gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:bg-background hover:text-primary"
                    onClick={() => onOpenBot(bot.id)}
                  >
                    <BarChart3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:bg-background hover:text-primary"
                    onClick={() => void handleCopyBotId(bot.id)}
                    aria-label={`Copy bot ID ${bot.name}`}
                  >
                    {copiedBotId === bot.id ? (
                      <Check className="h-4 w-4 text-primary" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-background hover:text-destructive"
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
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
