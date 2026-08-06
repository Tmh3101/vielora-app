-- Migration: Key billing resources by workspace instead of user
-- wallets: PK user_id -> workspace_id (moi workspace co vi rieng, mo khoa multi-workspace)
-- subscriptions: bo UNIQUE(user_id), them UNIQUE(workspace_id) (1 subscription / workspace)

-- Guard: dam bao du lieu hien tai khong co workspace_id trung lap
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.wallets GROUP BY workspace_id HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot migrate wallets: duplicate workspace_id rows exist';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.subscriptions GROUP BY workspace_id HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot migrate subscriptions: duplicate workspace_id rows exist';
  END IF;
END $$;

-- 1. Wallets: PK theo workspace_id
ALTER TABLE public.wallets DROP CONSTRAINT wallets_pkey;
ALTER TABLE public.wallets ADD PRIMARY KEY (workspace_id);
CREATE INDEX IF NOT EXISTS idx_wallets_user ON public.wallets (user_id);

-- 2. Subscriptions: 1 subscription / workspace (NULL workspace_id = personal billing, duoc phep nhieu rows)
DROP INDEX IF EXISTS public.subscriptions_user_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_workspace_id_key ON public.subscriptions (workspace_id);

-- 3. Index cho credit_transactions truy van theo workspace (payment history / monthly usage)
CREATE INDEX IF NOT EXISTS idx_credit_transactions_workspace ON public.credit_transactions (workspace_id);
