-- Migration: Refactor Workspace Subscriptions to Single Source of Truth (SSOT)
-- Description: Makes public.subscriptions the single source of truth for workspace plans.
-- Removes redundant plan_id and billing_cycle columns from public.workspaces.

-- 1. Backfill missing subscriptions for existing workspaces using their current plan_id & billing_cycle
INSERT INTO public.subscriptions (
  user_id,
  workspace_id,
  plan_id,
  billing_cycle,
  status,
  current_period_start,
  current_period_end,
  next_credit_reset_at,
  needs_bot_selection
)
SELECT
  w.owner_id,
  w.id,
  w.plan_id,
  COALESCE(w.billing_cycle, 'monthly'::public.billing_cycle),
  'active',
  now(),
  now() + INTERVAL '1 month',
  now() + INTERVAL '1 month',
  false
FROM public.workspaces w
WHERE NOT EXISTS (
  SELECT 1 FROM public.subscriptions s WHERE s.workspace_id = w.id
)
ON CONFLICT (workspace_id) DO NOTHING;

-- 2. Update trigger function for shared workspace knowledge limit to inspect subscriptions instead of workspaces
CREATE OR REPLACE FUNCTION public.enforce_workspace_knowledge_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_plan_limit INT;
  v_current_count INT;
BEGIN
  SELECT p.max_shared_knowledge_items INTO v_plan_limit
  FROM public.subscriptions s
  JOIN public.plans p ON s.plan_id = p.id
  WHERE s.workspace_id = NEW.workspace_id AND s.status = 'active';

  IF v_plan_limit IS NOT NULL THEN
    SELECT COUNT(*) INTO v_current_count
    FROM public.workspace_knowledge
    WHERE workspace_id = NEW.workspace_id;

    IF v_current_count >= v_plan_limit THEN
      RAISE EXCEPTION 'Workspace knowledge limit reached (% items max)', v_plan_limit;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Update handle_new_user_billing trigger function
-- Subscriptions & wallets are created per workspace in WorkspaceService.createWorkspace
CREATE OR REPLACE FUNCTION public.handle_new_user_billing()
RETURNS TRIGGER AS $$
BEGIN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Drop redundant plan_id and billing_cycle columns from workspaces
ALTER TABLE public.workspaces DROP COLUMN IF EXISTS plan_id;
ALTER TABLE public.workspaces DROP COLUMN IF EXISTS billing_cycle;
