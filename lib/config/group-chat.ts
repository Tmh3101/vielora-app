import { ESubscriptionPlan } from "@/types";

export const GROUP_MAX_MEMBERS = 5;
export const GROUP_MAX_HISTORY_MESSAGES = 20;
export const GROUP_MAX_MESSAGE_LENGTH = 1000;
export const GROUP_CHAT_ALLOWED_PLANS: ESubscriptionPlan[] = [
  ESubscriptionPlan.Pro,
  ESubscriptionPlan.Enterprise,
];
export const GROUP_HISTORY_RETENTION_DAYS: number | null = null;
export const GROUP_SUMMARY_CRON = "0 2 * * *";
export const GROUP_SUMMARY_WINDOW_DAYS = 30;
export const GROUP_INVITE_SESSION_REFRESH_DAYS = 7;
export const GROUP_LAST_TAB_STORAGE_KEY = "vielora_group_last_tab";
export { GROUP_CHAT_CONFIG } from "@/config/group-chat";
