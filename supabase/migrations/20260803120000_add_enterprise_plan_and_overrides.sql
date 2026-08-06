-- Migration: Add Enterprise Plan row and Subscription Overrides
-- Description: Inserts enterprise row in public.plans and adds bots_limit_override & monthly_credits_override columns to public.subscriptions.

INSERT INTO public.plans (code, name, bots_limit, monthly_credits, description, pricing, is_active)
VALUES (
  'enterprise', 'Enterprise', 50, 50000,
  'Tự cấu hình số lượng bot và credits (thanh toán & áp dụng ngay)',
  '{"VND":{"monthly":2900000,"yearly":31320000},"USD":{"monthly":125,"yearly":1350}}'::jsonb,
  true
)
ON CONFLICT (code) DO UPDATE
SET
  name = EXCLUDED.name,
  bots_limit = EXCLUDED.bots_limit,
  monthly_credits = EXCLUDED.monthly_credits,
  description = EXCLUDED.description,
  pricing = EXCLUDED.pricing,
  is_active = EXCLUDED.is_active;

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS bots_limit_override INT NULL,
  ADD COLUMN IF NOT EXISTS monthly_credits_override INT NULL;

CREATE INDEX IF NOT EXISTS idx_subscriptions_workspace_status ON public.subscriptions (workspace_id, status);
