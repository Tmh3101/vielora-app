-- Migration: Workspace Triggers & Quota Enforcement
-- Task 1.2: Database Triggers & Limit Enforcement

-- 1. Enforce Max 5 Active Workspaces Per User
CREATE OR REPLACE FUNCTION public.enforce_max_workspaces_per_user()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'active' THEN
    IF (
      SELECT COUNT(*) FROM public.workspace_members
      WHERE user_id = NEW.user_id AND status = 'active'
    ) >= 5 THEN
      RAISE EXCEPTION 'User cannot belong to more than 5 workspaces';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_max_workspaces ON public.workspace_members;
CREATE TRIGGER trg_enforce_max_workspaces
  BEFORE INSERT OR UPDATE ON public.workspace_members
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_max_workspaces_per_user();

-- 2. Auto-generate Invitation Token & Expiration Date
CREATE OR REPLACE FUNCTION public.generate_invitation_token()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.token IS NULL OR NEW.token = '' THEN
    NEW.token := encode(gen_random_bytes(32), 'hex');
  END IF;
  IF NEW.token_expires_at IS NULL THEN
    NEW.token_expires_at := now() + INTERVAL '7 days';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_invitation_token ON public.workspace_invitations;
CREATE TRIGGER trg_generate_invitation_token
  BEFORE INSERT ON public.workspace_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_invitation_token();

-- 3. Enforce Rate Limit: Max 10 Invitations per Workspace per Day
CREATE OR REPLACE FUNCTION public.enforce_invite_rate_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (
    SELECT COUNT(*) FROM public.workspace_invitations
    WHERE workspace_id = NEW.workspace_id
      AND created_at >= (now() - INTERVAL '24 hours')
  ) >= 10 THEN
    RAISE EXCEPTION 'Rate limit exceeded: max 10 invitations per workspace per day';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_invite_rate_limit ON public.workspace_invitations;
CREATE TRIGGER trg_enforce_invite_rate_limit
  BEFORE INSERT ON public.workspace_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_invite_rate_limit();
