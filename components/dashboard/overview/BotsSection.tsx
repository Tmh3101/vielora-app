"use client";

import { useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Bot,
  LayoutGrid,
  List,
  Loader2,
  Plus,
  Search,
  ArrowUpDown,
  ChevronDown,
  Upload,
  RotateCw,
} from "lucide-react";
import { toast } from "sonner";
import { useBotsList } from "@/hooks/dashboard/main/useBotsList";
import { BotsGrid } from "@/components/dashboard/overview/BotsGrid";
import { BotsTable } from "@/components/dashboard/overview/BotsTable";
import { getStatusColor, getStatusText } from "@/lib/helpers";

function getVisiblePages(currentPage: number, totalPages: number): Array<number | "ellipsis"> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
  const visiblePages = Array.from(pages)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);

  return visiblePages.reduce<Array<number | "ellipsis">>((items, page, index) => {
    if (index > 0 && page - visiblePages[index - 1] > 1) {
      items.push("ellipsis");
    }
    items.push(page);
    return items;
  }, []);
}

interface BotsSectionProps {
  indexedPagesByBot: Record<string, number>;
  onCreateNew: () => void;
  onImportCSV?: () => void;
  onOpenBot: (botId: string) => void;
  onDeleteBot: (botId: string, botName: string) => Promise<void>;
  onRefresh?: () => Promise<void> | void;
}

export function BotsSection({
  indexedPagesByBot,
  onCreateNew,
  onImportCSV,
  onOpenBot,
  onDeleteBot,
  onRefresh,
}: BotsSectionProps) {
  const {
    bots,
    total,
    page,
    pageSize,
    totalPages,
    inputValue,
    searchQuery,
    sortBy,
    sortOrder,
    viewMode,
    isLoading,
    isFetching,
    setPage,
    setInputValue,
    submitSearch,
    setSort,
    setViewMode,
    refetch,
  } = useBotsList();

  const handleSortSelect = useCallback(
    (value: string) => {
      switch (value) {
        case "name_asc":
          setSort("name", "asc");
          break;
        case "name_desc":
          setSort("name", "desc");
          break;
        case "created_at_desc":
          setSort("created_at", "desc");
          break;
        case "created_at_asc":
          setSort("created_at", "asc");
          break;
      }
    },
    [setSort]
  );

  const currentSortValue = `${sortBy}_${sortOrder}`;

  const firstItem = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastItem = Math.min(page * pageSize, total);

  const pageItems = useMemo(() => getVisiblePages(page, totalPages), [page, totalPages]);

  const handleDeleteBot = useCallback(
    async (botId: string, botName: string) => {
      await onDeleteBot(botId, botName);
      void refetch();
    },
    [onDeleteBot, refetch]
  );

  const handleRefresh = useCallback(async () => {
    try {
      await Promise.all([refetch(), onRefresh ? Promise.resolve(onRefresh()) : Promise.resolve()]);
      toast.success("Đã cập nhật danh sách chatbot mới nhất");
    } catch (error) {
      console.error("Error refreshing chatbot list:", error);
      toast.error("Không thể làm mới danh sách. Vui lòng thử lại.");
    }
  }, [refetch, onRefresh]);

  return (
    <section>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="heading-premium text-xl font-bold">Chatbots của bạn</h2>
          <p className="text-sm text-muted-foreground">Quản lý và theo dõi chatbot</p>
        </div>
        <div className="bg-gradient-primary btn-glow shadow-glow-sm group inline-flex items-center rounded-xl p-0.5 transition-all">
          <Button
            onClick={onCreateNew}
            className="h-9 gap-1.5 rounded-l-lg rounded-r-none border-r border-white/20 bg-transparent px-3.5 text-xs font-semibold text-white shadow-none hover:bg-white/15 focus-visible:ring-0"
          >
            <Plus className="h-4 w-4" />
            Tạo mới
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon"
                className="h-9 w-8 rounded-l-none rounded-r-lg bg-transparent px-0 text-white shadow-none hover:bg-white/15 focus-visible:ring-0"
                aria-label="Tùy chọn tạo bot"
              >
                <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="glass-md w-52 p-1.5 shadow-xl">
              <DropdownMenuItem
                onClick={onCreateNew}
                className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors hover:bg-primary/10 hover:text-primary focus:bg-primary/10 focus:text-primary"
              >
                <Plus className="h-4 w-4 text-primary" />
                Tạo bot đơn
              </DropdownMenuItem>
              {onImportCSV && (
                <DropdownMenuItem
                  onClick={onImportCSV}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors hover:bg-primary/10 hover:text-primary focus:bg-primary/10 focus:text-primary"
                >
                  <Upload className="h-4 w-4 text-primary" />
                  Import file CSV
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 sm:max-w-sm">
              <Input
                placeholder="Tìm kiếm chatbot theo tên..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    submitSearch();
                  }
                }}
                className="h-9 rounded-lg pr-20 text-sm"
              />
              <Button
                size="sm"
                variant="secondary"
                className="absolute right-1 top-1/2 h-7 -translate-y-1/2 px-2"
                onClick={submitSearch}
                disabled={isFetching}
              >
                {isFetching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Select value={currentSortValue} onValueChange={handleSortSelect}>
                <SelectTrigger className="h-9 w-44 rounded-lg text-sm">
                  <ArrowUpDown className="mr-2 h-3.5 w-3.5" />
                  <SelectValue placeholder="Sắp xếp" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name_asc" className="focus:bg-muted focus:text-foreground">
                    Tên A → Z
                  </SelectItem>
                  <SelectItem value="name_desc" className="focus:bg-muted focus:text-foreground">
                    Tên Z → A
                  </SelectItem>
                  <SelectItem
                    value="created_at_desc"
                    className="focus:bg-muted focus:text-foreground"
                  >
                    Mới nhất
                  </SelectItem>
                  <SelectItem
                    value="created_at_asc"
                    className="focus:bg-muted focus:text-foreground"
                  >
                    Cũ nhất
                  </SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="icon"
                onClick={handleRefresh}
                disabled={isFetching}
                title="Làm mới danh sách"
                aria-label="Làm mới danh sách chatbot"
                className="h-9 w-9 rounded-lg border transition-all hover:border-primary hover:bg-white hover:text-primary active:scale-95"
              >
                <RotateCw className={`h-4 w-4 ${isFetching ? "animate-spin text-primary" : ""}`} />
              </Button>

              <div className="flex items-center rounded-lg border">
                <Button
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-9 w-9 rounded-l-lg hover:border-primary hover:bg-white hover:text-primary"
                  onClick={() => setViewMode("grid")}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "table" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-9 w-9 rounded-r-lg hover:border-primary hover:bg-white hover:text-primary"
                  onClick={() => setViewMode("table")}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="p-6">
              <div className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-2xl" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <Skeleton className="h-14 rounded-xl" />
                <Skeleton className="h-14 rounded-xl" />
              </div>
              <Skeleton className="mt-4 h-9 w-full rounded-lg" />
            </Card>
          ))}
        </div>
      ) : bots.length === 0 ? (
        <Card className="glass-lg py-16 text-center">
          <CardContent>
            <div className="bg-gradient-primary/10 mx-auto mb-2 flex h-20 w-20 items-center justify-center rounded-3xl">
              <Bot className="h-10 w-10 text-primary" />
            </div>
            <h3 className="mb-3 text-xl font-semibold">
              {searchQuery ? "Không tìm thấy chatbot" : "Chưa có chatbot nào"}
            </h3>
            <p className="mx-auto mb-6 max-w-sm text-muted-foreground">
              {searchQuery
                ? `Không có chatbot nào tên "${searchQuery}". Thử tìm kiếm khác.`
                : "Tạo chatbot đầu tiên ngay bây giờ!"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {viewMode === "grid" ? (
            <BotsGrid
              bots={bots}
              indexedPagesByBot={indexedPagesByBot}
              getStatusColor={getStatusColor}
              getStatusText={getStatusText}
              onCreateNew={onCreateNew}
              onOpenBot={onOpenBot}
              onDeleteBot={handleDeleteBot}
            />
          ) : (
            <BotsTable
              bots={bots}
              indexedPagesByBot={indexedPagesByBot}
              getStatusColor={getStatusColor}
              getStatusText={getStatusText}
              onOpenBot={onOpenBot}
              onDeleteBot={handleDeleteBot}
            />
          )}

          {totalPages > 1 && (
            <div className="mt-6 flex flex-col items-center justify-between gap-4 sm:flex-row">
              <p className="text-sm text-muted-foreground">
                Hiển thị {firstItem.toLocaleString("vi-VN")}-{lastItem.toLocaleString("vi-VN")}{" "}
                trong {total.toLocaleString("vi-VN")} chatbot
              </p>

              <Pagination className="ml-auto w-auto justify-end">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      aria-disabled={page === 1}
                      className={
                        page === 1
                          ? "pointer-events-none opacity-50"
                          : "border border-background hover:bg-background hover:text-primary"
                      }
                      onClick={(e) => {
                        e.preventDefault();
                        if (page > 1) setPage(page - 1);
                      }}
                    />
                  </PaginationItem>

                  {pageItems.map((p, index) =>
                    p === "ellipsis" ? (
                      <PaginationItem key={`ellipsis-${index}`}>
                        <PaginationEllipsis />
                      </PaginationItem>
                    ) : (
                      <PaginationItem key={p}>
                        <PaginationLink
                          href="#"
                          isActive={p === page}
                          className={
                            p === page
                              ? "border border-primary bg-background text-primary hover:bg-background hover:text-primary"
                              : "border border-background hover:bg-background hover:text-primary"
                          }
                          onClick={(e) => {
                            e.preventDefault();
                            setPage(p);
                          }}
                        >
                          {p}
                        </PaginationLink>
                      </PaginationItem>
                    )
                  )}

                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      aria-disabled={page === totalPages}
                      className={
                        page === totalPages
                          ? "pointer-events-none opacity-50"
                          : "border border-background hover:bg-background hover:text-primary"
                      }
                      onClick={(e) => {
                        e.preventDefault();
                        if (page < totalPages) setPage(page + 1);
                      }}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </>
      )}
    </section>
  );
}
