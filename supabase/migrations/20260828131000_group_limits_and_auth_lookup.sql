-- Migration: Dynamic Group Member Limits & Auth User Lookup RPC
-- Description:
-- 1. Adds get_auth_user_by_email RPC for O(1) indexed user email lookups instead of scanning all auth users.
-- 2. Updates enforce_group_member_limit trigger to dynamically check workspace subscription plan limits (plans.max_members).

CREATE OR REPLACE FUNCTION public.get_auth_user_by_email(p_email text)
RETURNS TABLE (id uuid, email varchar)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.email::varchar
  FROM auth.users u
  WHERE lower(u.email) = lower(trim(p_email))
  LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_group_member_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_current_count integer;
  v_max_members integer := 5;
BEGIN
  SELECT COUNT(*) INTO v_current_count
  FROM public.group_members
  WHERE group_id = NEW.group_id;

  -- Attempt to resolve dynamic limit from workspace subscription plan
  SELECT COALESCE(p.max_members, 5) INTO v_max_members
  FROM public.group_chats gc
  JOIN public.bots b ON b.id = gc.bot_id
  LEFT JOIN public.subscriptions s ON s.workspace_id = b.workspace_id AND s.status = 'active'
  LEFT JOIN public.plans p ON p.id = s.plan_id
  WHERE gc.id = NEW.group_id
  LIMIT 1;

  -- Safety baseline: minimum 5 members for group chats
  v_max_members := GREATEST(COALESCE(v_max_members, 5), 5);

  IF v_current_count >= v_max_members THEN
    RAISE EXCEPTION 'GROUP_MEMBER_LIMIT_REACHED';
  END IF;

  RETURN NEW;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_auth_user_by_email(text) TO authenticated, service_role;
