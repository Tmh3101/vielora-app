"use client";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Bot, Loader2, MessageCircle, MessageSquare, Eye } from "lucide-react";
import type { QuestionDetailItem } from "@/hooks/dashboard/bot-detail/useChatHistory";

export interface QuestionDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isLoading: boolean;
  details: QuestionDetailItem[];
  parseMarkdown: (text: string) => string;
}

export function QuestionDetailDialog({
  open,
  onOpenChange,
  isLoading,
  details,
  parseMarkdown,
}: QuestionDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[75vh] max-w-2xl overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Chi tiết câu trả lời
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2 text-sm text-muted-foreground">Đang tải...</span>
            </div>
          ) : details.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageCircle className="mx-auto mb-2 h-8 w-8 opacity-50" />
                <p className="text-sm">Không tìm thấy cuộc hội thoại nào.</p>
              </div>
            </div>
          ) : (
            <ScrollArea className="h-96 pr-4">
              <div className="space-y-6">
                {details.map((detail, index) => (
                  <div key={index} className="rounded-lg border border-border/50 bg-card/50 p-6">
                    <div className="space-y-6">
                      <div className="flex gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                          <MessageSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1">
                          <p className="mb-3 text-base font-bold text-foreground">Câu hỏi</p>
                          <div
                            className="whitespace-pre-wrap text-lg leading-relaxed text-foreground"
                            dangerouslySetInnerHTML={{ __html: parseMarkdown(detail.question) }}
                          />
                        </div>
                      </div>

                      <div className="border-t border-border/30"></div>

                      <div className="flex gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                          <Bot className="h-5 w-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div className="flex-1">
                          <p className="mb-3 text-base font-bold text-foreground">Trả lời</p>
                          <div
                            className="whitespace-pre-wrap text-lg leading-relaxed text-foreground"
                            dangerouslySetInnerHTML={{ __html: parseMarkdown(detail.answer) }}
                          />
                        </div>
                      </div>

                      <div className="flex justify-end pt-2">
                        <span className="text-sm text-muted-foreground">{detail.timestamp}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
          >
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
