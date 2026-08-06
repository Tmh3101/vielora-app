-- Migration: Add workspace_id column & backfill for subscriptions and wallets tables
-- Task B1: Billing multi-tenancy schema & backfill fix

-- 1. Ensure workspace_id on subscriptions and wallets
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

ALTER TABLE public.wallets
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- 2. Indexes and Unique Constraints
CREATE INDEX IF NOT EXISTS idx_subscriptions_workspace ON public.subscriptions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_wallets_workspace ON public.wallets(workspace_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'wallets_workspace_id_key'
  ) THEN
    ALTER TABLE public.wallets ADD CONSTRAINT wallets_workspace_id_key UNIQUE (workspace_id);
  END IF;
END $$;

-- 3. Backfill workspace_id for existing subscriptions and wallets using user's owned workspace
UPDATE public.subscriptions s
SET workspace_id = w.id
FROM public.workspaces w
WHERE s.workspace_id IS NULL AND w.owner_id = s.user_id;

UPDATE public.wallets wl
SET workspace_id = w.id
FROM public.workspaces w
WHERE wl.workspace_id IS NULL AND w.owner_id = wl.user_id;
