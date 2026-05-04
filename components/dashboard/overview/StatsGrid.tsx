"use client";

import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Bot, Users, Zap } from "lucide-react";

export interface StatsGridProps {
  messagesThisMonth: number;
  totalConversations: number;
  botCount: number;
  botsLimit?: number;
  hasSubscription: boolean;
}

export function StatsGrid({
  messagesThisMonth,
  totalConversations,
  botCount,
  botsLimit,
  hasSubscription,
}: StatsGridProps) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
      <Card className="card-stat">
        <CardDescription className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          Tin nhắn tháng này
        </CardDescription>
        <CardTitle className="text-3xl">{messagesThisMonth}</CardTitle>
      </Card>

      <Card className="card-stat">
        <CardDescription className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          Cuộc hội thoại
        </CardDescription>
        <CardTitle className="text-3xl">{totalConversations}</CardTitle>
      </Card>

      <Card className="card-stat">
        <CardDescription className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" />
          Chatbots
        </CardDescription>
        <CardTitle className="text-3xl">
          {botCount}
          {hasSubscription && (
            <span className="text-lg font-normal text-muted-foreground">/{botsLimit}</span>
          )}
        </CardTitle>
      </Card>
    </div>
  );
}
