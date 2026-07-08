export const CACHE_TTLS = {
  BOT_WIDGET: 300,
  BOT_WIDGET_JITTER: 0.2,
  BOT_CONFIG: 600,
  BOT_CONFIG_JITTER: 0.2,
  STAMPEDE_LOCK: 2,
  STAMPEDE_RETRIES: 10,
  STAMPEDE_RETRY_MS: 50,
} as const;

export const COOLDOWN_MS = 30000; // 30 seconds

export const CACHE_KEYS = {
  botWidget: (botId: string) => `bot:${botId}:widget`,
  botWidgetSecure: (botId: string) => `bot:${botId}:widget-secure`,
  botConfig: (botId: string) => `bot:${botId}:config`,
} as const;
