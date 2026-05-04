-- Add 'stopped' status to bot_status enum
ALTER TYPE public.bot_status ADD VALUE IF NOT EXISTS 'stopped';

-- Add comment to document the new status
COMMENT ON TYPE public.bot_status IS 'Bot status: pending, discovering, discovered, indexing, ready, failed, stopped';