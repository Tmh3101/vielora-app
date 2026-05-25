-- Migration: Add single URL knowledge source type
-- Allows distinguishing one-off article/blog URLs from full website crawl pages.

ALTER TABLE public.pages DROP CONSTRAINT IF EXISTS pages_source_type_check;

ALTER TABLE public.pages
ADD CONSTRAINT pages_source_type_check
CHECK (source_type IN ('website', 'manual_text', 'file', 'single_url'));

COMMENT ON COLUMN public.pages.source_type IS 'Source of the page content: "website" for crawled pages, "manual_text" for user-entered knowledge, "file" for uploaded documents, "single_url" for one-off article/blog URLs';
