"use client";

import { useCallback, useEffect, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { fetchBotAnalytics } from "@/lib/services/analytics.service";
import {
  getQuestionDetails,
  getRecentUserMessagesByBotId,
} from "@/lib/services/conversations.service";

type SupabaseClient = ReturnType<typeof createBrowserSupabaseClient>;

interface ToastPayload {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
}

type ToastFn = (payload: ToastPayload) => void;

export type ChartPeriod = "today" | "7days" | "30days" | "year";

export interface QuestionDetailItem {
  question: string;
  answer: string;
  timestamp: string;
  user_id?: string;
}

export interface TopQuestionItem {
  content: string;
  count: number;
}

interface UseChatHistoryParams {
  botId: string;
  userId?: string;
  supabase: SupabaseClient;
  toast: ToastFn;
}

export interface UseChatHistoryResult {
  messagesMonth: number;
  topQuestions: TopQuestionItem[];
  messageChartData: Array<{ date: string; messages: number; conversations: number }>;
  conversationChartData: Array<{ date: string; messages: number; conversations: number }>;
  messageChartPeriod: ChartPeriod;
  conversationChartPeriod: ChartPeriod;
  questionDetailOpen: boolean;
  questionDetail: QuestionDetailItem[];
  isLoadingQuestionDetail: boolean;
  setMessageChartPeriod: (value: ChartPeriod) => void;
  setConversationChartPeriod: (value: ChartPeriod) => void;
  setQuestionDetailOpen: (open: boolean) => void;
  fetchAnalytics: (currentBotId: string) => Promise<void>;
  handleOpenQuestionDetail: (question: TopQuestionItem) => Promise<void>;
  parseMarkdown: (text: string) => string;
}

export function useChatHistory({
  botId,
  userId,
  supabase,
  toast,
}: UseChatHistoryParams): UseChatHistoryResult {
  const [messagesMonth, setMessagesMonth] = useState(0);
  const [topQuestions, setTopQuestions] = useState<TopQuestionItem[]>([]);
  const [messageChartData, setMessageChartData] = useState<
    Array<{ date: string; messages: number; conversations: number }>
  >([]);
  const [conversationChartData, setConversationChartData] = useState<
    Array<{ date: string; messages: number; conversations: number }>
  >([]);
  const [messageChartPeriod, setMessageChartPeriod] = useState<ChartPeriod>("7days");
  const [conversationChartPeriod, setConversationChartPeriod] = useState<ChartPeriod>("7days");
  const [questionDetailOpen, setQuestionDetailOpen] = useState(false);
  const [questionDetail, setQuestionDetail] = useState<QuestionDetailItem[]>([]);
  const [isLoadingQuestionDetail, setIsLoadingQuestionDetail] = useState(false);

  const fetchAnalytics = useCallback(
    async (currentBotId: string) => {
      try {
        const analyticsData = await fetchBotAnalytics(supabase, {
          botId: currentBotId,
          chartPeriod: "7days",
        });

        setMessagesMonth(analyticsData.messagesMonth);

        try {
          const recentQuestions = await getRecentUserMessagesByBotId(supabase, currentBotId, 5);
          setTopQuestions(recentQuestions);
        } catch (questionError) {
          console.error("Error fetching recent questions:", questionError);
          setTopQuestions([]);
        }

        const messageData = await fetchBotAnalytics(supabase, {
          botId: currentBotId,
          chartPeriod: messageChartPeriod,
        });
        setMessageChartData(messageData.chartData);

        const conversationData = await fetchBotAnalytics(supabase, {
          botId: currentBotId,
          chartPeriod: conversationChartPeriod,
        });
        setConversationChartData(conversationData.chartData);
      } catch (error) {
        console.error("Error fetching analytics:", error);
        setMessagesMonth(0);
        setTopQuestions([]);
        setMessageChartData([]);
        setConversationChartData([]);
      }
    },
    [conversationChartPeriod, messageChartPeriod, supabase]
  );

  const fetchMessageChartData = useCallback(
    async (currentBotId: string) => {
      try {
        const chartData = await fetchBotAnalytics(supabase, {
          botId: currentBotId,
          chartPeriod: messageChartPeriod,
        });
        setMessageChartData(chartData.chartData);
      } catch (error) {
        console.error("Error fetching message chart data:", error);
        setMessageChartData([]);
      }
    },
    [messageChartPeriod, supabase]
  );

  const fetchConversationChartData = useCallback(
    async (currentBotId: string) => {
      try {
        const chartData = await fetchBotAnalytics(supabase, {
          botId: currentBotId,
          chartPeriod: conversationChartPeriod,
        });
        setConversationChartData(chartData.chartData);
      } catch (error) {
        console.error("Error fetching conversation chart data:", error);
        setConversationChartData([]);
      }
    },
    [conversationChartPeriod, supabase]
  );

  useEffect(() => {
    if (userId && botId) {
      void fetchMessageChartData(botId);
    }
  }, [botId, fetchMessageChartData, messageChartPeriod, userId]);

  useEffect(() => {
    if (userId && botId) {
      void fetchConversationChartData(botId);
    }
  }, [botId, conversationChartPeriod, fetchConversationChartData, userId]);

  const handleOpenQuestionDetail = useCallback(
    async (question: TopQuestionItem) => {
      setQuestionDetailOpen(true);
      setIsLoadingQuestionDetail(true);

      try {
        const details = await getQuestionDetails(supabase, botId, question.content, 5);
        setQuestionDetail(details);
      } catch (error) {
        console.error("Error fetching question detail:", error);
        toast({
          title: "Lỗi",
          description: "Không thể tải chi tiết cuộc hội thoại.",
          variant: "destructive",
        });
        setQuestionDetail([]);
      } finally {
        setIsLoadingQuestionDetail(false);
      }
    },
    [botId, supabase, toast]
  );

  const parseMarkdown = useCallback((text: string): string => {
    if (!text) return "";

    let result = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    result = result.replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer" style="color: #2563eb; text-decoration: underline; text-underline-offset: 2px; font-weight: 500;">$1</a>'
    );

    result = result.replace(
      /(^|\s)(https?:\/\/[^\s<]+)/g,
      '$1<a href="$2" target="_blank" rel="noopener noreferrer" style="color: #2563eb; text-decoration: underline; text-underline-offset: 2px; font-weight: 500;">$2</a>'
    );

    result = result
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(
        /`([^`]+)`/g,
        '<code style="background-color: #f3f4f6; padding: 2px 4px; border-radius: 4px; font-size: 0.9em;">$1</code>'
      )
      .replace(/\n/g, "<br>");

    return result;
  }, []);

  return {
    messagesMonth,
    topQuestions,
    messageChartData,
    conversationChartData,
    messageChartPeriod,
    conversationChartPeriod,
    questionDetailOpen,
    questionDetail,
    isLoadingQuestionDetail,
    setMessageChartPeriod,
    setConversationChartPeriod,
    setQuestionDetailOpen,
    fetchAnalytics,
    handleOpenQuestionDetail,
    parseMarkdown,
  };
}
