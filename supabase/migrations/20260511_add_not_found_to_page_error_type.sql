-- Migration: add 'not_found' to page_error_type enum
ALTER TYPE public.page_error_type ADD VALUE IF NOT EXISTS 'not_found' AFTER 'url_error';
