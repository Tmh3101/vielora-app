-- Migration: Add source_type column to pages table
-- This allows distinguishing between website-crawled pages and manually entered knowledge

-- Step 1: Add the source_type column with a default value for existing rows
ALTER TABLE public.pages
ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'website';

-- Step 2: Add a CHECK constraint to ensure valid source_type values
ALTER TABLE public.pages
ADD CONSTRAINT pages_source_type_check
CHECK (source_type IN ('website', 'manual_text'));

-- Step 3: Add an index for filtering by source_type (useful for analytics and queries)
CREATE INDEX IF NOT EXISTS idx_pages_source_type ON public.pages (source_type);

-- Step 4: Add a composite index for bot_id + source_type queries
CREATE INDEX IF NOT EXISTS idx_pages_bot_id_source_type ON public.pages (bot_id, source_type);

COMMENT ON COLUMN public.pages.source_type IS 'Source of the page content: "website" for crawled pages, "manual_text" for user-entered knowledge';
