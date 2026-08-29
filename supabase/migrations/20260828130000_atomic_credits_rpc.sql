-- Migration: Atomic Workspace Credit Deduction and Refund RPCs
-- Description: Adds deduct_workspace_credits and refund_workspace_credits functions with row-level locking (FOR UPDATE)
-- to ensure atomic balance checks, wallet updates, and transaction logging within a single PostgreSQL transaction.

CREATE OR REPLACE FUNCTION public.deduct_workspace_credits(
  p_workspace_id uuid,
  p_amount integer,
  p_transaction_type text,
  p_description text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet RECORD;
  v_deduct_sub integer := 0;
  v_deduct_payg integer := 0;
  v_next_sub integer;
  v_next_payg integer;
BEGIN
  -- 0. Non-positive amount is a no-op
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object(
      'success', true,
      'deducted_from_subscription', 0,
      'deducted_from_payg', 0
    );
  END IF;

  -- 1. Lock wallet row for update
  SELECT * INTO v_wallet
  FROM public.wallets
  WHERE workspace_id = p_workspace_id
  FOR UPDATE;

  -- Auto-create wallet with default credits if missing (same logic as app layer)
  IF NOT FOUND THEN
    INSERT INTO public.wallets (workspace_id, subscription_credits, payg_credits)
    VALUES (p_workspace_id, 100, 0)
    ON CONFLICT (workspace_id) DO NOTHING;

    SELECT * INTO v_wallet
    FROM public.wallets
    WHERE workspace_id = p_workspace_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'message', 'Workspace wallet not found');
    END IF;
  END IF;

  -- 2. Balance validation
  IF (COALESCE(v_wallet.subscription_credits, 0) + COALESCE(v_wallet.payg_credits, 0)) < p_amount THEN
    RETURN jsonb_build_object('success', false, 'message', 'Insufficient workspace credits.');
  END IF;

  -- 3. Calculate deduction breakdown (subscription credits first, then PAYG)
  v_deduct_sub := LEAST(COALESCE(v_wallet.subscription_credits, 0), p_amount);
  v_deduct_payg := p_amount - v_deduct_sub;
  v_next_sub := COALESCE(v_wallet.subscription_credits, 0) - v_deduct_sub;
  v_next_payg := COALESCE(v_wallet.payg_credits, 0) - v_deduct_payg;

  -- 4. Update wallet atomically
  UPDATE public.wallets
  SET subscription_credits = v_next_sub,
      payg_credits = v_next_payg,
      updated_at = now()
  WHERE workspace_id = p_workspace_id;

  -- 5. Insert transaction ledger entry
  INSERT INTO public.credit_transactions (
    workspace_id,
    amount,
    transaction_type,
    description
  ) VALUES (
    p_workspace_id,
    -p_amount,
    p_transaction_type::public.transaction_type,
    p_description
  );

  RETURN jsonb_build_object(
    'success', true,
    'deducted_from_subscription', v_deduct_sub,
    'deducted_from_payg', v_deduct_payg
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.refund_workspace_credits(
  p_workspace_id uuid,
  p_deducted_sub integer,
  p_deducted_payg integer,
  p_transaction_type text,
  p_description text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_refund integer;
  v_wallet RECORD;
BEGIN
  v_total_refund := COALESCE(p_deducted_sub, 0) + COALESCE(p_deducted_payg, 0);
  IF v_total_refund <= 0 THEN
    RETURN jsonb_build_object('success', true, 'message', 'No refund needed');
  END IF;

  SELECT * INTO v_wallet
  FROM public.wallets
  WHERE workspace_id = p_workspace_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Workspace wallet not found');
  END IF;

  UPDATE public.wallets
  SET subscription_credits = COALESCE(subscription_credits, 0) + COALESCE(p_deducted_sub, 0),
      payg_credits = COALESCE(payg_credits, 0) + COALESCE(p_deducted_payg, 0),
      updated_at = now()
  WHERE workspace_id = p_workspace_id;

  INSERT INTO public.credit_transactions (
    workspace_id,
    amount,
    transaction_type,
    description
  ) VALUES (
    p_workspace_id,
    v_total_refund,
    p_transaction_type::public.transaction_type,
    p_description
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Grant permissions for service role and authenticated callers
GRANT EXECUTE ON FUNCTION public.deduct_workspace_credits(uuid, integer, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.refund_workspace_credits(uuid, integer, integer, text, text) TO authenticated, service_role;
