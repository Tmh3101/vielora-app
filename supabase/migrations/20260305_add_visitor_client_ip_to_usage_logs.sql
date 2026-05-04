-- Add visitor_id and client_ip columns to usage_logs;
-- remove the redundant user_id column (bot_id → bots.user_id is sufficient).
-- This allows merging the duplicate chat_message + chat_ip records into one,
-- and enables direct rate-limit queries without expensive joins through conversations/messages.

ALTER TABLE public.usage_logs
  ADD COLUMN IF NOT EXISTS visitor_id text NULL,
  ADD COLUMN IF NOT EXISTS client_ip  text NULL;

ALTER TABLE public.usage_logs
  DROP COLUMN IF EXISTS user_id;

-- Index for visitor-based rate limit queries
CREATE INDEX IF NOT EXISTS idx_usage_logs_bot_visitor_action_created
  ON public.usage_logs (bot_id, visitor_id, action, created_at DESC);

-- Index for IP-based rate limit queries
CREATE INDEX IF NOT EXISTS idx_usage_logs_bot_ip_action_created
  ON public.usage_logs (bot_id, client_ip, action, created_at DESC);
