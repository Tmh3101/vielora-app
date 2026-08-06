-- Migration: Enforce NOT NULL workspace_id Constraints
-- Task 4.2: Enforce Database NOT NULL Constraints

DO $$
BEGIN
  -- 1. Verify no NULL workspace_id values exist
  IF EXISTS (SELECT 1 FROM public.bots WHERE workspace_id IS NULL) THEN
    RAISE EXCEPTION 'Cannot enforce NOT NULL on bots: NULL workspace_id rows exist';
  END IF;

  -- 2. Alter column constraints to NOT NULL where appropriate
  ALTER TABLE public.bots ALTER COLUMN workspace_id SET NOT NULL;
END $$;
