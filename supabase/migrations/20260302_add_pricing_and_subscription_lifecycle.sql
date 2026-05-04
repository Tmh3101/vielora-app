-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Add pricing JSONB to plans & subscription lifecycle tracking
-- Created:   2026-03-02
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. plans: add pricing column ─────────────────────────────────────────────

ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS pricing jsonb DEFAULT '{}'::jsonb NOT NULL;

-- Seed / update pricing data for all plans.
-- yearly prices are slightly cheaper than 12 × monthly.
INSERT INTO public.plans (code, name, bots_limit, monthly_credits, description, pricing, is_active)
VALUES
  (
    'free', 'Free', 1, 1000, 'Starter plan for new users',
    '{"VND": {"monthly": 0, "yearly": 0}, "USD": {"monthly": 0, "yearly": 0}}'::jsonb,
    true
  ),
  (
    'standard', 'Standard', 3, 5000, 'Balanced plan for growing teams',
    '{"VND": {"monthly": 149000, "yearly": 1490000}, "USD": {"monthly": 9, "yearly": 90}}'::jsonb,
    true
  ),
  (
    'pro', 'Pro', 10, 20000, 'Advanced plan for high-usage teams',
    '{"VND": {"monthly": 499000, "yearly": 4990000}, "USD": {"monthly": 29, "yearly": 290}}'::jsonb,
    true
  )
ON CONFLICT (code) DO UPDATE
SET
  name            = EXCLUDED.name,
  bots_limit      = EXCLUDED.bots_limit,
  monthly_credits = EXCLUDED.monthly_credits,
  description     = EXCLUDED.description,
  pricing         = EXCLUDED.pricing,
  is_active       = EXCLUDED.is_active;

-- ── 2. subscriptions: add next_credit_reset_at column ────────────────────────

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS next_credit_reset_at timestamptz
    DEFAULT now() + '1 mon'::interval NOT NULL;

-- Back-fill existing rows: align reset date with current_period_end so the
-- first cronjob run will fire at the correct time.
UPDATE public.subscriptions
SET next_credit_reset_at = current_period_end
WHERE next_credit_reset_at = (SELECT column_default::timestamptz
                               FROM information_schema.columns
                               WHERE table_schema = 'public'
                                 AND table_name   = 'subscriptions'
                                 AND column_name  = 'next_credit_reset_at'
                               LIMIT 1)
   OR true; -- safe: update all rows to sync with their own current_period_end

-- Simpler, unambiguous back-fill (replaces the above):
UPDATE public.subscriptions
SET next_credit_reset_at = current_period_end;

-- ── 3. handle_new_user_billing(): set period dates & next_credit_reset_at ────

CREATE OR REPLACE FUNCTION public.handle_new_user_billing()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  v_free_plan_id    uuid;
  v_monthly_credits int4;
BEGIN
  SELECT id, monthly_credits
  INTO v_free_plan_id, v_monthly_credits
  FROM public.plans
  WHERE code = 'free'
  LIMIT 1;

  IF v_free_plan_id IS NULL THEN
    RAISE EXCEPTION 'Missing required plan: free';
  END IF;

  INSERT INTO public.subscriptions (
    user_id,
    plan_id,
    billing_cycle,
    status,
    current_period_start,
    current_period_end,
    next_credit_reset_at
  )
  VALUES (
    NEW.id,
    v_free_plan_id,
    'monthly',
    'active',
    now(),
    now() + '1 mon'::interval,
    now() + '1 mon'::interval
  );

  INSERT INTO public.wallets (user_id, subscription_credits, payg_credits, is_payg_enabled)
  VALUES (NEW.id, v_monthly_credits, 0, false);

  INSERT INTO public.credit_transactions (user_id, amount, transaction_type, description)
  VALUES (
    NEW.id,
    v_monthly_credits,
    'subscription_renewal',
    format('Initial %s credits granted for free plan', v_monthly_credits)
  );

  RETURN NEW;
END;
$function$;
