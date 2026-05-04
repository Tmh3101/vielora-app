-- Migrate 'stopped' from bot_status enum to a dedicated boolean column

-- Step 1: Add is_stopped column
ALTER TABLE public.bots
  ADD COLUMN IF NOT EXISTS is_stopped boolean NOT NULL DEFAULT false;

-- Step 2: Migrate existing data — mark rows, then reset their status
UPDATE public.bots SET is_stopped = true WHERE status = 'stopped';
UPDATE public.bots SET status = 'ready'  WHERE status = 'stopped';

-- Step 3: Recreate bot_status enum without 'stopped'
-- (PostgreSQL does not support removing values from an existing enum)
ALTER TYPE public.bot_status RENAME TO bot_status_old;

CREATE TYPE public.bot_status AS ENUM (
  'pending', 'discovering', 'discovered', 'indexing', 'ready', 'failed'
);

-- Drop default before changing column type
ALTER TABLE public.bots ALTER COLUMN status DROP DEFAULT;

ALTER TABLE public.bots
  ALTER COLUMN status TYPE public.bot_status
  USING status::text::public.bot_status;

-- Restore default
ALTER TABLE public.bots
  ALTER COLUMN status SET DEFAULT 'pending'::public.bot_status;

DROP TYPE public.bot_status_old;

-- Update type comment
COMMENT ON TYPE public.bot_status IS 'Bot lifecycle status. Use is_stopped (boolean) to suspend a bot without changing its lifecycle status.';
COMMENT ON COLUMN public.bots.is_stopped IS 'When true, the bot is manually suspended by its owner and will not serve widget requests.';
