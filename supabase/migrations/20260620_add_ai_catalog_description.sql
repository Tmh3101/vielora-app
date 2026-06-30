-- Migration: Add description and sort_order to AI catalog
-- Created: 2026-06-20

-- ============================================================
-- 1. ADD description COLUMNS
-- ============================================================
ALTER TABLE public.ai_personalities ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.ai_skills ADD COLUMN IF NOT EXISTS description text;

COMMENT ON COLUMN public.ai_personalities.description IS 'Mô tả ngắn bằng tiếng Việt hiển thị trong UI';
COMMENT ON COLUMN public.ai_skills.description IS 'Mô tả ngắn bằng tiếng Việt hiển thị trong UI';

-- ============================================================
-- 2. ADD sort_order TO bot_skills (control skill injection order)
-- ============================================================
ALTER TABLE public.bot_skills ADD COLUMN IF NOT EXISTS sort_order smallint NOT NULL DEFAULT 0;
