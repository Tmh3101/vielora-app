-- ============================================================================
-- Migration: Group Notes Schema, Enums, Triggers, and RLS
-- Date: 2026-08-16
-- Description: Adds 'system' to group_message_sender_type, creates group_notes table,
--              adds can_create_note to group_members, implements single active note trigger,
--              and sets up RLS policies & Realtime publication.
-- ============================================================================

-- 1. Extend sender type enum for in-chat automated system messages
-- Note: ALTER TYPE ADD VALUE cannot run inside multi-statement transactions in older Postgres,
-- but is supported in Supabase Postgres migrations.
ALTER TYPE public.group_message_sender_type ADD VALUE IF NOT EXISTS 'system';

-- 2. Add permission flag to group_members
ALTER TABLE public.group_members
  ADD COLUMN IF NOT EXISTS can_create_note boolean NOT NULL DEFAULT false;

-- 3. Create group_notes table
CREATE TABLE IF NOT EXISTS public.group_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.group_chats(id) ON DELETE CASCADE,
  bot_id uuid NOT NULL REFERENCES public.bots(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  content_html text NOT NULL,
  content_text text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  archived_at timestamptz NULL,
  collapsed boolean NOT NULL DEFAULT false,
  document_id uuid NULL REFERENCES public.documents(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Create performance and lookup indexes
CREATE INDEX IF NOT EXISTS idx_group_notes_group_id_created
  ON public.group_notes (group_id, created_at DESC);

-- UNIQUE partial index: hard backstop guaranteeing at most 1 active note per group
-- even under concurrent inserts (row-level trigger alone can race). Review B1/R2.
CREATE UNIQUE INDEX IF NOT EXISTS idx_group_notes_single_active
  ON public.group_notes (group_id)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_group_notes_bot_id
  ON public.group_notes (bot_id);

CREATE INDEX IF NOT EXISTS idx_group_notes_document_id
  ON public.group_notes (document_id);

-- 5. Trigger to enforce exactly one active note per group
CREATE OR REPLACE FUNCTION public.enforce_single_active_note()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.is_active = true THEN
    UPDATE public.group_notes
    SET is_active = false,
        archived_at = COALESCE(archived_at, now()),
        updated_at = now()
    WHERE group_id = NEW.group_id
      AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND is_active = true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_single_active_note ON public.group_notes;
CREATE TRIGGER trg_enforce_single_active_note
  BEFORE INSERT OR UPDATE OF is_active ON public.group_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_single_active_note();

-- 6. Trigger for updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_group_notes_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_group_notes_updated_at ON public.group_notes;
CREATE TRIGGER trg_group_notes_updated_at
  BEFORE UPDATE ON public.group_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_group_notes_updated_at();

-- 7. Enable Row Level Security (RLS)
ALTER TABLE public.group_notes ENABLE ROW LEVEL SECURITY;

-- Read policy: Any member of the group can view notes
DROP POLICY IF EXISTS "group_notes_member_select" ON public.group_notes;
CREATE POLICY "group_notes_member_select" ON public.group_notes
  FOR SELECT
  USING (
    public.is_group_member(group_id, auth.uid())
  );

-- Write policy: Commons model (is_bot_manager OR can_create_note = true)
DROP POLICY IF EXISTS "group_notes_manager_or_authorized_write" ON public.group_notes;
CREATE POLICY "group_notes_manager_or_authorized_write" ON public.group_notes
  FOR ALL
  USING (
    public.is_bot_manager((SELECT bot_id FROM public.group_chats WHERE id = group_id), auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = group_notes.group_id
        AND gm.user_id = auth.uid()
        AND gm.can_create_note = true
    )
  )
  WITH CHECK (
    public.is_bot_manager((SELECT bot_id FROM public.group_chats WHERE id = group_id), auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = group_notes.group_id
        AND gm.user_id = auth.uid()
        AND gm.can_create_note = true
    )
  );

-- 8. Add group_notes to Realtime Publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'group_notes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.group_notes;
  END IF;
END $$;
