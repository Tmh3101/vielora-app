"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { BarChart3, Eye, MessageCircle, TrendingUp } from "lucide-react";
import { EBotStatus } from "@/types";
import type { Tables } from "@/lib/supabase/types";
import type { ChartPeriod, TopQuestionItem } from "@/hooks/dashboard/bot-detail/useChatHistory";

type BotType = Tables<"bots">;

export interface OverviewTabProps {
  bot: BotType;
  pagesCount: number;
  messagesMonth: number;
  messageChartData: Array<{ date: string; messages: number; conversations: number }>;
  conversationChartData: Array<{ date: string; messages: number; conversations: number }>;
  messageChartPeriod: ChartPeriod;
  conversationChartPeriod: ChartPeriod;
  topQuestions: TopQuestionItem[];
  setMessageChartPeriod: (value: ChartPeriod) => void;
  setConversationChartPeriod: (value: ChartPeriod) => void;
  onOpenQuestionDetail: (question: TopQuestionItem) => Promise<void>;
}

export function OverviewTab({
  bot,
  pagesCount,
  messagesMonth,
  messageChartData,
  conversationChartData,
  messageChartPeriod,
  conversationChartPeriod,
  topQuestions,
  setMessageChartPeriod,
  setConversationChartPeriod,
  onOpenQuestionDetail,
}: OverviewTabProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="glass">
          <CardHeader>
            <CardDescription>Trạng thái</CardDescription>
            <CardTitle className="flex items-center gap-2 text-lg">
              <span
                className={`h-2 w-2 rounded-full ${
                  bot.is_stopped
                    ? "bg-gray-500"
                    : bot.status === EBotStatus.Ready
                      ? "bg-green-500"
                      : bot.status === EBotStatus.Failed
                        ? "bg-red-500"
                        : "bg-yellow-500"
                }`}
              />
              {bot.is_stopped
                ? "Đã dừng"
                : bot.status === EBotStatus.Ready
                  ? "Hoạt động"
                  : bot.status === EBotStatus.Failed
                    ? "Lỗi"
                    : "Đang xử lý"}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="glass">
          <CardHeader>
            <CardDescription>Số trang đã index</CardDescription>
            <CardTitle className="text-lg">{pagesCount} trang</CardTitle>
          </CardHeader>
        </Card>
        <Card className="glass">
          <CardHeader>
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Tin nhắn tháng này
            </CardDescription>
            <CardTitle className="text-lg">{messagesMonth}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="glass">
          <CardHeader>
            <CardDescription>Lần crawl cuối</CardDescription>
            <CardTitle className="text-lg">
              {bot.last_crawl_at
                ? new Date(bot.last_crawl_at).toLocaleString("vi-VN")
                : "Chưa crawl"}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="glass">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Tin nhắn theo thời gian</CardTitle>
              <CardDescription>Số lượng tin nhắn từ người dùng</CardDescription>
            </div>
            <Select value={messageChartPeriod} onValueChange={setMessageChartPeriod}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  value="today"
                  className="hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground"
                >
                  Hôm nay
                </SelectItem>
                <SelectItem
                  value="7days"
                  className="hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground"
                >
                  7 ngày
                </SelectItem>
                <SelectItem
                  value="30days"
                  className="hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground"
                >
                  30 ngày
                </SelectItem>
                <SelectItem
                  value="year"
                  className="hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground"
                >
                  Năm
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {messageChartData.length > 0 ? (
            <ChartContainer
              config={{
                messages: {
                  label: "Tin nhắn",
                  color: "hsl(var(--primary))",
                },
              }}
              className="h-[400px] w-full"
            >
              <AreaChart data={messageChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent hideIndicator />} />
                <Area
                  type="monotone"
                  dataKey="messages"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          ) : (
            <div className="flex h-[400px] items-center justify-center text-muted-foreground">
              <div className="text-center">
                <BarChart3 className="mx-auto mb-2 h-8 w-8 opacity-50" />
                <p className="text-sm">Chưa có dữ liệu</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="glass">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Cuộc hội thoại theo thời gian</CardTitle>
                <CardDescription>Số lượng cuộc hội thoại mới</CardDescription>
              </div>
              <Select value={conversationChartPeriod} onValueChange={setConversationChartPeriod}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    value="today"
                    className="hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground"
                  >
                    Hôm nay
                  </SelectItem>
                  <SelectItem
                    value="7days"
                    className="hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground"
                  >
                    7 ngày
                  </SelectItem>
                  <SelectItem
                    value="30days"
                    className="hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground"
                  >
                    30 ngày
                  </SelectItem>
                  <SelectItem
                    value="year"
                    className="hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground"
                  >
                    Năm
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {conversationChartData.length > 0 ? (
              <ChartContainer
                config={{
                  conversations: {
                    label: "Cuộc hội thoại",
                    color: "hsl(var(--chart-2))",
                  },
                }}
                className="h-[200px] w-full"
              >
                <BarChart data={conversationChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent hideIndicator />} />
                  <Bar dataKey="conversations" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="flex h-[200px] items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <BarChart3 className="mx-auto mb-2 h-8 w-8 opacity-50" />
                  <p className="text-sm">Chưa có dữ liệu</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader>
            <CardTitle>5 Câu hỏi gần đây</CardTitle>
            <CardDescription>Câu hỏi gần nhất từ người dùng</CardDescription>
          </CardHeader>
          <CardContent>
            {topQuestions.length === 0 ? (
              <div className="flex h-[200px] items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MessageCircle className="mx-auto mb-4 h-8 w-8 opacity-50" />
                  <p className="text-sm">
                    Chưa có dữ liệu. Dữ liệu sẽ hiển thị khi có người dùng chat.
                  </p>
                </div>
              </div>
            ) : (
              <ScrollArea className="h-[200px]">
                <div className="space-y-3">
                  {topQuestions.map((q, index) => (
                    <div
                      key={index}
                      className="group relative overflow-hidden rounded-xl border border-border/50 bg-card px-4 py-3 transition-all duration-200 hover:border-primary/30 hover:shadow-sm"
                    >
                      <div className="flex min-w-0 items-center gap-4">
                        <div className="min-w-0 flex-1 overflow-hidden">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                              <MessageCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="w-0 flex-1">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <p className="cursor-default truncate text-base font-medium text-foreground">
                                      {q.content}
                                    </p>
                                  </TooltipTrigger>
                                  <TooltipContent
                                    className="max-w-md whitespace-pre-wrap break-words"
                                    side="top"
                                  >
                                    <p className="text-sm">{q.content}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
                            onClick={() => void onOpenQuestionDetail(q)}
                            title="Xem chi tiết cuộc hội thoại"
                          >
                            <Eye className="h-4 w-4 text-primary" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
