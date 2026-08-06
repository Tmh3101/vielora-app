-- Fix: wallets now keyed by workspace_id — signup trigger no longer creates a wallet
-- (the wallet is created per-workspace by WorkspaceService.createWorkspace)
-- Subscription stays user-level with NULL workspace_id and gets attached on first payment.
CREATE OR REPLACE FUNCTION public.handle_new_user_billing()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_free_plan_id    uuid;
BEGIN
  SELECT id
  INTO v_free_plan_id
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

  RETURN NEW;
END;
$function$;

-- Trigger function is only invoked by the trigger itself — revoke public EXECUTE
REVOKE EXECUTE ON FUNCTION public.handle_new_user_billing() FROM anon, authenticated;
