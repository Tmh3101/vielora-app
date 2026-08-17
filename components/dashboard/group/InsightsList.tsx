"use client";

import { useEffect, useState } from "react";
import { Sparkles, Calendar, Clock, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { parseMarkdown } from "@/lib/helpers";

interface InsightsListProps {
  botId?: string;
}

interface InsightData {
  bot_id: string;
  group_id: string;
  summary: string;
  document_id: string | null;
  last_summarized_message_at: string | null;
  updated_at: string;
}

export function InsightsList({ botId }: InsightsListProps) {
  const [insight, setInsight] = useState<InsightData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!botId) {
      setIsLoading(false);
      return;
    }
    const loadInsight = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/bots/${botId}/group/insights`);
        const json = await res.json();
        if (json.success) {
          setInsight(json.data || null);
        }
      } catch (err) {
        console.error("Error fetching insights:", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadInsight();
  }, [botId]);

  if (isLoading) {
    return (
      <div className="flex min-h-[180px] flex-col items-center justify-center gap-2 p-6 text-center text-xs text-muted-foreground">
        <RefreshCw className="h-5 w-5 animate-spin text-primary" />
        <span>Đang tải bản tổng hợp tự động...</span>
      </div>
    );
  }

  if (!insight || !insight.summary) {
    return (
      <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 p-6 text-center text-sm text-muted-foreground">
        <div className="mx-auto mb-2.5 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Sparkles className="h-5 w-5 opacity-80" />
        </div>
        <p className="text-xs font-semibold text-foreground">Chưa có bản tổng hợp 24h</p>
        <p className="mx-auto mt-1 max-w-sm text-[11px] leading-relaxed text-muted-foreground">
          Hệ thống sẽ tự động tổng hợp hội thoại nhóm lúc 02:00 AM hàng ngày khi nhóm có từ 2 tin
          nhắn trở lên và tự động nạp vào kho kiến thức RAG.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Top Status & Date Header */}
      <div className="flex items-center justify-between gap-2">
        <Badge
          variant="outline"
          className="shadow-2xs h-6 shrink-0 border-primary/25 bg-primary/10 px-2.5 text-[11px] font-medium text-primary"
        >
          <Sparkles className="mr-1.5 h-3 w-3" />
          Bản tổng hợp 24h gần nhất
        </Badge>

        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" />
          <span>
            {new Date(insight.updated_at).toLocaleDateString("vi-VN", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })}
          </span>
          <span className="text-border">•</span>
          <Clock className="h-3 w-3" />
          <span>
            {new Date(insight.updated_at).toLocaleTimeString("vi-VN", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      </div>

      {/* Summary Content Container with matching max-height scroll area */}
      <div className="max-h-[480px] overflow-y-auto pr-1">
        <div className="shadow-2xs backdrop-blur-xs rounded-xl border border-border/50 bg-card/70 p-4 text-card-foreground transition-all hover:border-border/80 hover:bg-card">
          <div
            className="prose prose-sm max-w-none text-xs leading-relaxed text-foreground/90 dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: parseMarkdown(insight.summary) }}
          />
        </div>
      </div>
    </div>
  );
}
