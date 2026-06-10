"use client";

import { useState } from "react";
import { Bot, MessageSquareQuote } from "lucide-react";
import type { RecentQuestionInsight } from "@/lib/services/analytics.service";
import { parseMarkdown } from "@/lib/helpers";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface RecentQuestionsCardProps {
  questions: RecentQuestionInsight[];
}

/**
 * Format a timestamp into a Vietnamese-localized string showing hour, minute, day, and month.
 *
 * @param value - A timestamp string parseable by the JavaScript Date constructor (for example an ISO 8601 string)
 * @returns A `vi-VN` locale string with two-digit hour, minute, day, and month (e.g., "08:30, 01/02")
 */
function formatTimestamp(value: string) {
  return new Date(value).toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  });
}

/**
 * Render a card showing recent user questions with fallback indicators and timestamps.
 *
 * @param questions - Array of recent question insights to display; each item shows content, creation time, and whether it triggered a fallback.
 * @returns A JSX element containing a styled card that displays either an empty state or a list of recent questions with status badges and a footer note.
 */
export function RecentQuestionsCard({ questions }: RecentQuestionsCardProps) {
  const [showAllOpen, setShowAllOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<RecentQuestionInsight | null>(null);
  const [keyword, setKeyword] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const visibleQuestions = questions.slice(0, 10);
  const hasMoreQuestions = questions.length > 10;
  const keywordNormalized = keyword.trim().toLowerCase();
  const fromTime = fromDate ? new Date(`${fromDate}T00:00:00`).getTime() : null;
  const toTime = toDate ? new Date(`${toDate}T23:59:59`).getTime() : null;

  const filteredQuestions = questions.filter((question) => {
    const questionTime = new Date(question.createdAt).getTime();
    const matchesKeyword =
      keywordNormalized.length === 0 || question.content.toLowerCase().includes(keywordNormalized);
    const matchesFrom = fromTime === null || questionTime >= fromTime;
    const matchesTo = toTime === null || questionTime <= toTime;
    return matchesKeyword && matchesFrom && matchesTo;
  });

  return (
    <>
      <Card className="glass border-border/60">
        <CardHeader className="pb-4">
          <CardTitle>Câu hỏi gần đây</CardTitle>
          <CardDescription>
            Nhấn vào từng câu hỏi để xem câu trả lời tương ứng của bot.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {questions.length === 0 ? (
            <div className="flex h-[360px] items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageSquareQuote className="mx-auto mb-3 h-8 w-8 opacity-50" />
                <p className="text-sm">Chưa có câu hỏi nào trong khoảng thời gian này</p>
              </div>
            </div>
          ) : (
            <ScrollArea className="h-[360px] pr-2">
              <div className="space-y-3">
                {visibleQuestions.map((question, index) => (
                  <button
                    key={`${question.createdAt}-${index}`}
                    type="button"
                    onClick={() => setSelectedQuestion(question)}
                    className="group relative w-full overflow-hidden rounded-xl border border-border/50 bg-card px-4 py-2.5 text-left transition-all duration-200 hover:border-primary/30 hover:shadow-md"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                          question.hasFallback
                            ? "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400"
                            : "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                        }`}
                      >
                        <MessageSquareQuote className="h-4 w-4" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="truncate font-semibold text-foreground">
                            {question.content}
                          </h4>
                          {question.hasFallback && (
                            <Badge
                              variant="outline"
                              className="shrink-0 border-0 bg-rose-100 text-[10px] font-medium uppercase tracking-wide text-rose-700"
                            >
                              Fallback
                            </Badge>
                          )}
                        </div>
                        {/* <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          Nhấn để xem phản hồi chi tiết của bot
                        </p> */}
                      </div>

                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className="text-xs font-medium text-muted-foreground">
                          {formatTimestamp(question.createdAt)}
                        </span>
                        <span
                          className={`flex items-center gap-1 text-xs ${
                            question.hasFallback ? "text-rose-600" : "text-green-600"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              question.hasFallback ? "bg-rose-500" : "bg-green-500"
                            }`}
                          />
                          {question.hasFallback ? "Cần rà soát" : "Đã phản hồi"}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}

                {hasMoreQuestions && (
                  <button
                    type="button"
                    className="w-full py-2 text-sm font-medium text-primary underline underline-offset-4 transition-colors hover:text-primary/80"
                    onClick={() => setShowAllOpen(true)}
                  >
                    Xem thêm {questions.length - 10} câu hỏi
                  </button>
                )}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Dialog open={showAllOpen} onOpenChange={setShowAllOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Tất cả câu hỏi gần đây</DialogTitle>
            <DialogDescription>
              Có tổng cộng {questions.length} câu hỏi trong khoảng thời gian đã chọn.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 rounded-lg border border-border/50 bg-muted/20 p-3 sm:grid-cols-3">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Từ khóa câu hỏi</p>
              <Input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="Nhập từ khóa..."
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Từ ngày</p>
              <Input
                type="date"
                value={fromDate}
                onChange={(event) => setFromDate(event.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Đến ngày</p>
              <Input
                type="date"
                value={toDate}
                onChange={(event) => setToDate(event.target.value)}
                className="h-9"
              />
            </div>
          </div>
          <ScrollArea className="h-[60vh] pr-2">
            <div className="space-y-3">
              {filteredQuestions.map((question, index) => (
                <button
                  key={`${question.createdAt}-all-${index}`}
                  type="button"
                  onClick={() => setSelectedQuestion(question)}
                  className="group relative w-full overflow-hidden rounded-xl border border-border/50 bg-card px-4 py-3 text-left transition-all duration-200 hover:border-primary/30 hover:shadow-md"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                        question.hasFallback
                          ? "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400"
                          : "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                      }`}
                    >
                      <MessageSquareQuote className="h-4 w-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="truncate font-semibold text-foreground">
                          {question.content}
                        </h4>
                        {question.hasFallback && (
                          <Badge
                            variant="outline"
                            className="shrink-0 border-0 bg-rose-100 text-[10px] font-medium uppercase tracking-wide text-rose-700"
                          >
                            Fallback
                          </Badge>
                        )}
                      </div>
                      {/* <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        Nhấn để xem phản hồi chi tiết của bot
                      </p> */}
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="text-xs font-medium text-muted-foreground">
                        {formatTimestamp(question.createdAt)}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
              {filteredQuestions.length === 0 && (
                <div className="rounded-xl border border-dashed border-border/60 bg-card/40 p-6 text-center text-sm text-muted-foreground">
                  Không có câu hỏi nào phù hợp với bộ lọc hiện tại.
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedQuestion} onOpenChange={(open) => !open && setSelectedQuestion(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Câu hỏi và phản hồi của bot</DialogTitle>
            <DialogDescription>
              {selectedQuestion ? formatTimestamp(selectedQuestion.createdAt) : ""}
            </DialogDescription>
          </DialogHeader>
          {selectedQuestion && (
            <div className="space-y-4">
              <div className="rounded-xl border border-border/50 bg-card px-4 py-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                    <MessageSquareQuote className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      {selectedQuestion.hasFallback && (
                        <Badge
                          variant="outline"
                          className="border-0 bg-rose-100 text-[10px] font-medium uppercase tracking-wide text-rose-700"
                        >
                          Fallback
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm leading-6 text-foreground">{selectedQuestion.content}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border/50 bg-card px-4 py-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div
                      className="prose prose-sm max-w-none whitespace-normal break-words text-sm leading-6 text-foreground"
                      dangerouslySetInnerHTML={{ __html: parseMarkdown(selectedQuestion.answer) }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
