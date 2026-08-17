-- ============================================================================
-- Migration: Add source_message_id to group_notes
-- Date: 2026-08-17
-- Description: Adds source_message_id column to track notes created from pinned messages.
-- ============================================================================

ALTER TABLE public.group_notes
  ADD COLUMN IF NOT EXISTS source_message_id uuid REFERENCES public.group_messages(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_group_notes_source_message_id
  ON public.group_notes(source_message_id);
