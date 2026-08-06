"use client";

import { useMemo, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { BOTS_PAGE_SIZE } from "@/lib/constants/pagination";
import type { Tables } from "@/lib/supabase/types";
import { useWorkspace } from "@/hooks/useWorkspace";

type BotType = Tables<"bots">;

export type BotSortBy = "name" | "created_at";
export type BotSortOrder = "asc" | "desc";
export type BotViewMode = "grid" | "table";

interface UseBotsListParams {
  pageSize?: number;
}

interface BotsListData {
  bots: BotType[];
  total: number;
  page: number;
  limit: number;
}

async function getAccessToken() {
  const supabase = createBrowserSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

export function useBotsList({ pageSize = BOTS_PAGE_SIZE }: UseBotsListParams = {}) {
  const { activeWorkspace } = useWorkspace();
  const workspaceId = activeWorkspace?.id;
  const [page, setPage] = useState(1);
  const [inputValue, setInputValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<BotSortBy>("created_at");
  const [sortOrder, setSortOrder] = useState<BotSortOrder>("desc");
  const [viewMode, setViewMode] = useState<BotViewMode>("grid");

  const queryKey = useMemo(
    () => ["bots-list", workspaceId, page, searchQuery, sortBy, sortOrder, pageSize],
    [workspaceId, page, searchQuery, sortBy, sortOrder, pageSize]
  );

  const query = useQuery<BotsListData>({
    queryKey,
    queryFn: async () => {
      const token = await getAccessToken();
      if (!token) throw new Error("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");

      const params = new URLSearchParams({
        page: String(page),
        limit: String(pageSize),
        sortBy,
        sortOrder,
      });
      if (workspaceId) {
        params.set("workspaceId", workspaceId);
      }
      if (searchQuery.trim()) {
        params.set("search", searchQuery.trim());
      }

      const response = await fetch(`/api/bots?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.message);
      return result.data as BotsListData;
    },
    placeholderData: (prev) => prev,
  });

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handleInputChange = useCallback((value: string) => {
    setInputValue(value);
  }, []);

  const submitSearch = useCallback(() => {
    const trimmed = inputValue.trim();
    setSearchQuery(trimmed);
    setPage(1);
  }, [inputValue]);

  const handleSortChange = useCallback((newSortBy: BotSortBy, newSortOrder: BotSortOrder) => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
    setPage(1);
  }, []);

  const totalPages = query.data ? Math.ceil(query.data.total / pageSize) : 0;

  return {
    bots: query.data?.bots ?? [],
    total: query.data?.total ?? 0,
    page,
    pageSize,
    totalPages,
    inputValue,
    searchQuery,
    sortBy,
    sortOrder,
    viewMode,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    setPage: handlePageChange,
    setInputValue: handleInputChange,
    submitSearch,
    setSort: handleSortChange,
    setSortBy,
    setSortOrder,
    setViewMode,
    refetch: query.refetch,
  };
}
