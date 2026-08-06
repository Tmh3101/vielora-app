-- Migration: Production Data Backfill Script (Single-to-Multi-Tenant)
-- Task 1.4: Production-Safe Data Migration Script (DML)

-- 1. Ensure workspace_id on subscriptions and wallets
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

ALTER TABLE public.wallets
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_subscriptions_workspace ON public.subscriptions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_wallets_workspace ON public.wallets(workspace_id);

-- 2. Data Migration Function
DO $$
DECLARE
  v_user RECORD;
  v_free_plan_id UUID;
  v_user_plan_id UUID;
  v_ws_id UUID;
  v_base_slug TEXT;
  v_slug TEXT;
  v_counter INT;
  v_orphaned_bots INT;
BEGIN
  -- Fetch Default Free Plan ID
  SELECT id INTO v_free_plan_id FROM public.plans WHERE code = 'free' LIMIT 1;
  IF v_free_plan_id IS NULL THEN
    SELECT id INTO v_free_plan_id FROM public.plans ORDER BY created_at ASC LIMIT 1;
  END IF;

  FOR v_user IN SELECT id, email, created_at FROM auth.users LOOP
    -- Check if user already has an active workspace membership
    IF NOT EXISTS (SELECT 1 FROM public.workspace_members WHERE user_id = v_user.id) THEN
      
      -- Determine Plan ID from active subscription or default to Free
      SELECT plan_id INTO v_user_plan_id 
      FROM public.subscriptions 
      WHERE user_id = v_user.id AND status IN ('active', 'trialing')
      ORDER BY created_at DESC LIMIT 1;

      IF v_user_plan_id IS NULL THEN
        v_user_plan_id := v_free_plan_id;
      END IF;

      -- Generate base slug from email (e.g. john@domain.com -> john)
      v_base_slug := lower(regexp_replace(split_part(COALESCE(v_user.email, 'user'), '@', 1), '[^a-z0-9]', '-', 'g'));
      IF v_base_slug IS NULL OR length(v_base_slug) < 2 THEN
        v_base_slug := 'workspace';
      END IF;

      -- Resolve unique slug collisions
      v_slug := v_base_slug;
      v_counter := 1;
      WHILE EXISTS (SELECT 1 FROM public.workspaces WHERE slug = v_slug) LOOP
        v_slug := v_base_slug || '-' || v_counter || '-' || substring(v_user.id::text from 1 for 4);
        v_counter := v_counter + 1;
      END LOOP;

      -- Insert Default Workspace
      INSERT INTO public.workspaces (
        name,
        slug,
        owner_id,
        plan_id,
        billing_cycle,
        status,
        created_at
      ) VALUES (
        COALESCE(split_part(v_user.email, '@', 1), 'User') || '''s Workspace',
        v_slug,
        v_user.id,
        v_user_plan_id,
        'monthly',
        'active',
        COALESCE(v_user.created_at, now())
      ) RETURNING id INTO v_ws_id;

      -- Add User as Owner in workspace_members
      INSERT INTO public.workspace_members (
        workspace_id,
        user_id,
        role_id,
        status,
        accepted_at
      ) VALUES (
        v_ws_id,
        v_user.id,
        'owner',
        'active',
        now()
      );

      -- Backfill workspace_id across user assets
      UPDATE public.subscriptions SET workspace_id = v_ws_id WHERE user_id = v_user.id AND workspace_id IS NULL;
      UPDATE public.wallets SET workspace_id = v_ws_id WHERE user_id = v_user.id AND workspace_id IS NULL;
      UPDATE public.bots SET workspace_id = v_ws_id WHERE user_id = v_user.id AND workspace_id IS NULL;
      UPDATE public.payments SET workspace_id = v_ws_id WHERE user_id = v_user.id AND workspace_id IS NULL;
      UPDATE public.invoices SET workspace_id = v_ws_id WHERE user_id = v_user.id AND workspace_id IS NULL;
      UPDATE public.credit_transactions SET workspace_id = v_ws_id WHERE user_id = v_user.id AND workspace_id IS NULL;
      UPDATE public.usage_logs SET workspace_id = v_ws_id WHERE bot_id IN (SELECT id FROM public.bots WHERE workspace_id = v_ws_id) AND workspace_id IS NULL;

    END IF;
  END LOOP;

  -- Backfill bot_knowledge from existing pages table if pages table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pages') THEN
    INSERT INTO public.bot_knowledge (
      bot_id,
      workspace_id,
      title,
      content,
      source_type,
      metadata,
      embedding,
      created_at
    )
    SELECT
      p.bot_id,
      b.workspace_id,
      COALESCE(p.url, 'Untitled Page'),
      COALESCE(p.content, ''),
      COALESCE(p.source_type, 'url'),
      '{}'::jsonb,
      NULL,
      COALESCE(p.crawled_at, now())
    FROM public.pages p
    JOIN public.bots b ON p.bot_id = b.id
    WHERE NOT EXISTS (
      SELECT 1 FROM public.bot_knowledge bk WHERE bk.bot_id = p.bot_id AND bk.title = COALESCE(p.url, 'Untitled Page')
    );
  END IF;

  -- Validation Routine: Check for orphaned bots
  SELECT COUNT(*) INTO v_orphaned_bots FROM public.bots WHERE workspace_id IS NULL;
  IF v_orphaned_bots > 0 THEN
    RAISE EXCEPTION 'Data migration failed: % orphaned bots found without workspace_id', v_orphaned_bots;
  END IF;

END $$;
