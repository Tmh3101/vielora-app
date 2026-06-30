"use client";

import { useMemo, useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  Search,
  UserCheck,
  UserPlus,
} from "lucide-react";
import type { BotLeadRow } from "@/lib/services/lead.service";

const STATUS_LABELS: Record<string, string> = {
  pending: "Chờ liên hệ",
  contacted: "Đã liên hệ",
  closed: "Đã đóng",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 hover:bg-amber-100",
  contacted: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  closed: "bg-gray-100 text-gray-500 hover:bg-gray-100",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function LeadDetailSheet({
  lead,
  open,
  onOpenChange,
  onStatusUpdate,
  isUpdating,
}: {
  lead: BotLeadRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusUpdate: (leadId: string, status: string) => void;
  isUpdating: boolean;
}) {
  if (!lead) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Chi tiết liên hệ
          </SheetTitle>
          <SheetDescription>Gửi lúc {formatDate(lead.created_at)}</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <div>
            <h4 className="mb-1 text-sm font-medium text-muted-foreground">
              Câu hỏi chưa được trả lời
            </h4>
            <p className="rounded-lg bg-muted p-3 text-sm font-medium">
              {lead.unanswered_question}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-muted-foreground">Tên</h4>
              <p className="text-sm">{lead.customer_name}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground">Email</h4>
              <p className="text-sm">{lead.customer_email}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground">SĐT</h4>
              <p className="text-sm">{lead.customer_phone || "—"}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground">Trạng thái</h4>
              <Badge className={STATUS_COLORS[lead.status] || ""}>
                {STATUS_LABELS[lead.status] || lead.status}
              </Badge>
            </div>
          </div>

          {lead.note && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground">Ghi chú</h4>
              <p className="text-sm">{lead.note}</p>
            </div>
          )}

          <div>
            <h4 className="mb-1 text-sm font-medium text-muted-foreground">Cập nhật trạng thái</h4>
            <div className="flex gap-2">
              {lead.status !== "contacted" && (
                <Button
                  size="sm"
                  disabled={isUpdating}
                  onClick={() => onStatusUpdate(lead.id, "contacted")}
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Đang cập nhật...
                    </>
                  ) : (
                    <>
                      <UserCheck className="mr-2 h-4 w-4" />
                      Đã liên hệ
                    </>
                  )}
                </Button>
              )}
              {lead.status !== "closed" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-background text-muted-foreground transition-colors hover:border-destructive hover:bg-background hover:text-destructive"
                  disabled={isUpdating}
                  onClick={() => onStatusUpdate(lead.id, "closed")}
                >
                  Đóng
                </Button>
              )}
            </div>
          </div>

          {lead.chat_history &&
            Array.isArray(lead.chat_history) &&
            lead.chat_history.length > 0 && (
              <div>
                <h4 className="mb-1 text-sm font-medium text-muted-foreground">
                  Lịch sử trò chuyện
                </h4>
                <ScrollArea className="h-60 rounded-lg border p-3">
                  {(lead.chat_history as Array<{ role: string; content: string }>).map((msg, i) => (
                    <div
                      key={i}
                      className={`mb-2 rounded-lg px-3 py-2 text-sm ${
                        msg.role === "user" ? "ml-4 bg-primary/10" : "mr-4 bg-muted"
                      }`}
                    >
                      <span className="text-[10px] font-medium uppercase text-muted-foreground">
                        {msg.role === "user" ? "Khách" : "Bot"}
                      </span>
                      <p className="mt-0.5">{msg.content}</p>
                    </div>
                  ))}
                </ScrollArea>
              </div>
            )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function LeadsTab({ botId }: { botId: string }) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedLead, setSelectedLead] = useState<BotLeadRow | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const pageSize = 10;

  const { data, isLoading } = useQuery({
    queryKey: ["bot-leads", botId, page, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: String(pageSize),
        offset: String(page * pageSize),
      });
      if (statusFilter !== "all") params.set("status", statusFilter);

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");

      const response = await fetch(`/api/bots/${botId}/leads?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.message);
      return result.data as { leads: BotLeadRow[]; total: number };
    },
    enabled: !!botId,
  });

  const statusMutation = useMutation({
    mutationFn: async ({ leadId, status }: { leadId: string; status: string }) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");

      const response = await fetch(`/api/bots/${botId}/leads`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ leadId, status }),
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bot-leads", botId] });
      setSheetOpen(false);
      setSelectedLead(null);
    },
  });

  const handleViewLead = useCallback(async (lead: BotLeadRow) => {
    setSelectedLead(lead);
    setSheetOpen(true);
  }, []);

  const handleStatusUpdate = useCallback(
    (leadId: string, status: string) => {
      statusMutation.mutate({ leadId, status });
    },
    [statusMutation]
  );

  const totalPages = data ? Math.ceil(data.total / pageSize) : 0;

  const filteredLeads =
    data?.leads.filter((lead) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        lead.customer_name.toLowerCase().includes(q) ||
        lead.customer_email.toLowerCase().includes(q) ||
        (lead.customer_phone || "").includes(q) ||
        lead.unanswered_question.toLowerCase().includes(q)
      );
    }) ?? [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-left text-lg font-semibold">Liên hệ khách hàng</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9 w-48 rounded-lg pl-9 text-sm"
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={(v) => {
                  setStatusFilter(v);
                  setPage(0);
                }}
              >
                <SelectTrigger className="h-9 w-36 rounded-lg text-sm">
                  <SelectValue placeholder="Trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="focus:bg-muted focus:text-foreground">
                    Tất cả
                  </SelectItem>
                  <SelectItem value="pending" className="focus:bg-muted focus:text-foreground">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                      Chờ liên hệ
                    </span>
                  </SelectItem>
                  <SelectItem value="contacted" className="focus:bg-muted focus:text-foreground">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-blue-500" />
                      Đã liên hệ
                    </span>
                  </SelectItem>
                  <SelectItem value="closed" className="focus:bg-muted focus:text-foreground">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-gray-400" />
                      Đã đóng
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <UserPlus className="mb-2 h-10 w-10 opacity-30" />
              <p className="text-sm">Chưa có phản hồi khách hàng nào</p>
              <p className="text-xs opacity-60">
                Leads sẽ xuất hiện khi khách hàng để lại thông tin qua form trong chat
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tên</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>SĐT</TableHead>
                      <TableHead className="max-w-[200px]">Câu hỏi</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead>Ngày gửi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLeads.map((lead) => (
                      <TableRow
                        key={lead.id}
                        className="cursor-pointer transition-colors hover:bg-muted/50"
                        onClick={() => handleViewLead(lead)}
                      >
                        <TableCell className="font-medium">{lead.customer_name}</TableCell>
                        <TableCell className="text-sm">{lead.customer_email}</TableCell>
                        <TableCell className="text-sm">{lead.customer_phone || "—"}</TableCell>
                        <TableCell className="max-w-[200px] truncate text-sm">
                          {lead.unanswered_question}
                        </TableCell>
                        <TableCell>
                          <Badge className={STATUS_COLORS[lead.status] || ""}>
                            {STATUS_LABELS[lead.status] || lead.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {formatDate(lead.created_at)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <p className="text-sm text-muted-foreground">Tổng số: {data?.total ?? 0}</p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-background hover:text-primary"
                      disabled={page === 0}
                      onClick={() => setPage(0)}
                    >
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-background hover:text-primary"
                      disabled={page === 0}
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="px-3 text-sm text-muted-foreground">
                      {page + 1} / {totalPages}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-background hover:text-primary"
                      disabled={page >= totalPages - 1}
                      onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-background hover:text-primary"
                      disabled={page >= totalPages - 1}
                      onClick={() => setPage(totalPages - 1)}
                    >
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <LeadDetailSheet
        lead={selectedLead}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onStatusUpdate={handleStatusUpdate}
        isUpdating={statusMutation.isPending}
      />
    </div>
  );
}
