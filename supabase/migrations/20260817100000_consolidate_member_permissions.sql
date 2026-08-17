-- ============================================================================
-- Migration: Consolidate member permissions to can_create_note
-- Date: 2026-08-17
-- Description: Backfills can_create_note from can_pin_knowledge and sets up a sync trigger.
-- ============================================================================

-- 1. Backfill can_create_note from can_pin_knowledge
UPDATE public.group_members
SET can_create_note = true
WHERE can_pin_knowledge = true AND can_create_note = false;

-- 2. Trigger to sync can_pin_knowledge with can_create_note for backward compatibility
CREATE OR REPLACE FUNCTION public.sync_group_member_permissions()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.can_create_note IS DISTINCT FROM OLD.can_create_note THEN
    NEW.can_pin_knowledge = NEW.can_create_note;
  ELSIF NEW.can_pin_knowledge IS DISTINCT FROM OLD.can_pin_knowledge THEN
    NEW.can_create_note = NEW.can_pin_knowledge;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_group_member_permissions ON public.group_members;
CREATE TRIGGER trg_sync_group_member_permissions
  BEFORE UPDATE ON public.group_members
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_group_member_permissions();
