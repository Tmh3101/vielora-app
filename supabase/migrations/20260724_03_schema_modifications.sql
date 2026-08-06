-- Migration: Knowledge, Webhook, and Multi-Tenant Schema Modifications
-- Task 1.3: Knowledge, Webhook, and Helper Schema Modification

-- 1. Extend Existing Tables with workspace_id
ALTER TABLE public.bots
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL;

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL;

ALTER TABLE public.credit_transactions
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

ALTER TABLE public.usage_logs
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL;

-- Create Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_bots_workspace ON public.bots(workspace_id);
CREATE INDEX IF NOT EXISTS idx_payments_workspace ON public.payments(workspace_id);
CREATE INDEX IF NOT EXISTS idx_invoices_workspace ON public.invoices(workspace_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_workspace ON public.credit_transactions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_workspace ON public.usage_logs(workspace_id);

-- 2. Extend Plans Table
ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS max_members INT DEFAULT 5,
  ADD COLUMN IF NOT EXISTS max_shared_knowledge_items INT, -- NULL = unlimited
  ADD COLUMN IF NOT EXISTS max_webhooks INT DEFAULT 10,
  ADD COLUMN IF NOT EXISTS max_bot_private_knowledge INT DEFAULT 500;

-- Update Plans Limit Configuration
UPDATE public.plans SET max_members = 1, max_shared_knowledge_items = NULL, max_webhooks = 2, max_bot_private_knowledge = 100 WHERE code = 'free';
UPDATE public.plans SET max_members = 5, max_shared_knowledge_items = 1000, max_webhooks = 5, max_bot_private_knowledge = 500 WHERE code = 'standard';
UPDATE public.plans SET max_members = 20, max_shared_knowledge_items = 5000, max_webhooks = 10, max_bot_private_knowledge = 2000 WHERE code = 'pro';

-- 3. Create Shared Workspace Knowledge Table
CREATE TABLE IF NOT EXISTS public.workspace_knowledge (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    source_type TEXT DEFAULT 'file',
    metadata JSONB DEFAULT '{}'::jsonb,
    embedding vector(1536),
    status TEXT DEFAULT 'active',
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workspace_knowledge_workspace ON public.workspace_knowledge(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_knowledge_embedding ON public.workspace_knowledge USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Trigger for Shared Workspace Knowledge Limits
CREATE OR REPLACE FUNCTION public.enforce_workspace_knowledge_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_plan_limit INT;
  v_current_count INT;
BEGIN
  SELECT p.max_shared_knowledge_items INTO v_plan_limit
  FROM public.workspaces w
  JOIN public.plans p ON w.plan_id = p.id
  WHERE w.id = NEW.workspace_id;

  -- NULL means unlimited
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

DROP TRIGGER IF EXISTS trg_enforce_workspace_knowledge_limit ON public.workspace_knowledge;
CREATE TRIGGER trg_enforce_workspace_knowledge_limit
  BEFORE INSERT ON public.workspace_knowledge
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_workspace_knowledge_limit();

-- 4. Create Bot Private Knowledge Table
CREATE TABLE IF NOT EXISTS public.bot_knowledge (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bot_id UUID NOT NULL REFERENCES public.bots(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    source_type TEXT DEFAULT 'file',
    metadata JSONB DEFAULT '{}'::jsonb,
    embedding vector(1536),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bot_knowledge_bot ON public.bot_knowledge(bot_id);
CREATE INDEX IF NOT EXISTS idx_bot_knowledge_workspace ON public.bot_knowledge(workspace_id);
CREATE INDEX IF NOT EXISTS idx_bot_knowledge_embedding ON public.bot_knowledge USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- 5. Create Workspace Webhooks Table
CREATE TABLE IF NOT EXISTS public.workspace_webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    secret TEXT NOT NULL,
    events TEXT[] NOT NULL DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workspace_webhooks_workspace ON public.workspace_webhooks(workspace_id);

-- Trigger for Max Webhooks Limit (Max 10 per workspace)
CREATE OR REPLACE FUNCTION public.enforce_max_webhooks_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_count INT;
BEGIN
  IF NEW.is_active = true THEN
    SELECT COUNT(*) INTO v_count
    FROM public.workspace_webhooks
    WHERE workspace_id = NEW.workspace_id AND is_active = true;

    IF v_count >= 10 THEN
      RAISE EXCEPTION 'Maximum limit of 10 active webhooks reached per workspace';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_max_webhooks_limit ON public.workspace_webhooks;
CREATE TRIGGER trg_enforce_max_webhooks_limit
  BEFORE INSERT OR UPDATE ON public.workspace_webhooks
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_max_webhooks_limit();
