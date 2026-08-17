"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Pin, Trash2, HelpCircle, CheckCircle, Search, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { fetchPinnedKnowledgeApi, unpinKnowledgeApi } from "@/lib/api/group-chat";
import { ChatKnowledgeRow } from "@/lib/services/group-chat.service";
import { useToast } from "@/hooks/use-toast";
import { parseMarkdown } from "@/lib/helpers";

interface PinnedKnowledgeListProps {
  botId: string;
}

export function PinnedKnowledgeList({ botId }: PinnedKnowledgeListProps) {
  const [items, setItems] = useState<ChatKnowledgeRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [unpinningId, setUnpinningId] = useState<string | null>(null);
  const { toast } = useToast();

  const loadKnowledge = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetchPinnedKnowledgeApi(botId);
      if (res.success && res.data) {
        setItems(res.data);
      }
    } catch (err) {
      console.error("Error loading pinned knowledge:", err);
    } finally {
      setIsLoading(false);
    }
  }, [botId]);

  useEffect(() => {
    loadKnowledge();
  }, [loadKnowledge]);

  const handleUnpin = async (id: string) => {
    try {
      setUnpinningId(id);
      const ok = await unpinKnowledgeApi(botId, id);
      if (ok) {
        setItems((prev) => prev.filter((item) => item.id !== id));
        toast({
          title: "Đã gỡ ghim",
          description: "Đã xóa bản ghi khỏi kho kiến thức RAG.",
        });
      }
    } catch (err) {
      console.error("Error unpinning item:", err);
      toast({
        title: "Lỗi",
        description: "Không thể gỡ ghim mục này.",
        variant: "destructive",
      });
    } finally {
      setUnpinningId(null);
    }
  };

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(
      (item) => item.question?.toLowerCase().includes(q) || item.answer?.toLowerCase().includes(q)
    );
  }, [items, searchQuery]);

  if (isLoading) {
    return (
      <div className="flex min-h-[180px] flex-col items-center justify-center gap-2 p-6 text-center text-xs text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span>Đang tải danh sách kiến thức đã ghim...</span>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 p-6 text-center text-sm text-muted-foreground">
        <div className="mx-auto mb-2.5 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Pin className="h-5 w-5 opacity-80" />
        </div>
        <p className="text-xs font-semibold text-foreground">Chưa có kiến thức được ghim</p>
        <p className="mx-auto mt-1 max-w-sm text-[11px] leading-relaxed text-muted-foreground">
          Các tin nhắn được ghim từ nhóm chat sẽ xuất hiện ở đây và tự động nạp vào kho kiến thức
          RAG của bot.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Search Bar & Counter Toolbar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm theo câu hỏi hoặc câu trả lời..."
            className="h-8 bg-background/50 pl-8 pr-7 text-xs focus-visible:bg-background"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <Badge
            variant="outline"
            className="shadow-2xs h-6 shrink-0 border-primary/25 bg-primary/10 px-2.5 text-[11px] font-medium text-primary"
          >
            {searchQuery
              ? `${filteredItems.length} / ${items.length} mục`
              : `${items.length} mục đã ghim`}
          </Badge>
        </div>
      </div>

      {/* Pinned Items Scrollable Container */}
      {filteredItems.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 p-6 text-center text-xs text-muted-foreground">
          <p>Không tìm thấy kiến thức ghim nào phù hợp với &quot;{searchQuery}&quot;</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSearchQuery("")}
            className="mt-2 h-7 text-xs text-primary"
          >
            Xóa bộ lọc tìm kiếm
          </Button>
        </div>
      ) : (
        <div className="max-h-[480px] space-y-2.5 overflow-y-auto pr-1">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="shadow-2xs backdrop-blur-xs hover:shadow-xs group relative flex items-start justify-between gap-3 rounded-xl border border-border/50 bg-card/70 p-3.5 text-card-foreground transition-all hover:border-border/80 hover:bg-card"
            >
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex items-start gap-2 text-xs font-semibold text-foreground">
                  <HelpCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                  <div
                    className="prose prose-sm max-w-none break-words text-xs font-semibold leading-snug text-foreground dark:prose-invert"
                    dangerouslySetInnerHTML={{ __html: parseMarkdown(`**Hỏi:** ${item.question}`) }}
                  />
                </div>
                {item.answer && (
                  <div className="flex items-start gap-2 border-l-2 border-primary/40 pl-3 text-xs text-muted-foreground">
                    <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                    <div
                      className="prose prose-sm max-w-none break-words text-xs leading-relaxed text-muted-foreground dark:prose-invert"
                      dangerouslySetInnerHTML={{ __html: parseMarkdown(item.answer) }}
                    />
                  </div>
                )}
                <p className="pt-0.5 text-[11px] text-muted-foreground">
                  Đã ghim:{" "}
                  {new Date(item.created_at).toLocaleString("vi-VN", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-muted-foreground opacity-60 transition-opacity hover:bg-destructive/10 hover:text-destructive hover:opacity-100"
                disabled={unpinningId === item.id}
                onClick={() => handleUnpin(item.id)}
                title="Gỡ ghim khỏi kho kiến thức"
              >
                {unpinningId === item.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-destructive" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
