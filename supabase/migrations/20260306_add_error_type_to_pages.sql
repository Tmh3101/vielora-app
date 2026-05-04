-- Migration: add error_type enum and http_status_code to pages table
-- This enables categorized error tracking alongside the free-text error_message

DO $$ BEGIN
  CREATE TYPE public.page_error_type AS ENUM (
    'network_error',
    'timeout_error',
    'http_error',
    'rate_limited',
    'blocked',
    'parse_error',
    'render_error',
    'empty_content',
    'url_error',
    'unknown_error'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE public.pages
  ADD COLUMN IF NOT EXISTS error_type  public.page_error_type NULL,
  ADD COLUMN IF NOT EXISTS http_status_code int4 NULL;

COMMENT ON COLUMN public.pages.error_type       IS 'Categorized error type when status = ''failed''';
COMMENT ON COLUMN public.pages.http_status_code IS 'HTTP status code returned by the server during fetch';

CREATE INDEX IF NOT EXISTS idx_pages_bot_error_type ON public.pages (bot_id, error_type);
