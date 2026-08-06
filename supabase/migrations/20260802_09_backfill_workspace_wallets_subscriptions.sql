-- Backfill: workspace duoc tao thu cong (khong qua WorkspaceService.createWorkspace)
-- khong co wallet + subscription free -> UI hien thi 0 credits, khong index duoc.
-- Backfill nhat quan voi createWorkspace: chi tao wallet + subscription (khong ghi audit tx).

-- 1. Wallets
INSERT INTO public.wallets (workspace_id, user_id, subscription_credits, payg_credits, is_payg_enabled)
SELECT w.id, w.owner_id, COALESCE(p.monthly_credits, 100), 0, false
FROM public.workspaces w
LEFT JOIN public.plans p ON p.code = 'free'
WHERE NOT EXISTS (
  SELECT 1 FROM public.wallets wl WHERE wl.workspace_id = w.id
);

-- 2. Subscriptions
INSERT INTO public.subscriptions (
  user_id, workspace_id, plan_id, status, billing_cycle,
  current_period_start, current_period_end, next_credit_reset_at
)
SELECT w.owner_id, w.id, p.id, 'active', 'monthly', now(), now() + interval '1 month', now() + interval '1 month'
FROM public.workspaces w
JOIN public.plans p ON p.code = 'free'
WHERE NOT EXISTS (
  SELECT 1 FROM public.subscriptions s WHERE s.workspace_id = w.id
);
