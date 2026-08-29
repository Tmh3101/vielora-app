-- Migration: add in-page anchors to public.pages (FR-9 Smart Homepage auto-populate)
-- Date: 2026-08-22

-- Stores extracted in-page section anchors so navigation can deep-link to
-- specific sections (e.g. /about#contact) without re-crawling.
ALTER TABLE public.pages ADD COLUMN IF NOT EXISTS
  anchors jsonb NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.pages.anchors IS
  'Array of in-page section anchors extracted during crawl: '
  '[{"id": "contact", "text": "Liên hệ", "tag": "section"}]. '
  'Used by Smart Homepage (FR-9) to generate deep-link navigation entries.';
