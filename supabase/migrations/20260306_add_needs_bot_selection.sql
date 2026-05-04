-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Add needs_bot_selection flag to subscriptions
-- Created:   2026-03-06
-- Purpose:   Distinguish system-triggered bot stops (cron/upgrade) from
--            user-initiated stops, so the bot selector modal only appears
--            when the system triggers it.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS needs_bot_selection boolean DEFAULT false NOT NULL;
