-- ============================================================
-- Migration: Enable Row Level Security on all tables
-- and create fine-grained access policies.
--
-- Security model:
--   • "authenticated" role  = logged-in user (JWT in Authorization header)
--   • "anon" role           = unauthenticated (widget visitors, public)
--   • service_role          = bypasses ALL policies (used by webhooks & workers)
--
-- Policy naming convention:
--   <table>_<operation>_<subject>
-- ============================================================

-- ============================================================
-- 1. plans  (public reference data, immutable by users)
-- ============================================================
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

-- Anyone (anon + authenticated) can read plans
CREATE POLICY "plans_select_public"
  ON public.plans FOR SELECT
  USING (true);

-- INSERT / UPDATE / DELETE are blocked for anon + authenticated;
-- only service_role (webhook / admin) can mutate plans.


-- ============================================================
-- 2. profiles  (one row per auth user)
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profiles_delete_own"
  ON public.profiles FOR DELETE
  USING (auth.uid() = user_id);


-- ============================================================
-- 3. bots  (owned by user via user_id)
-- ============================================================
ALTER TABLE public.bots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bots_select_own"
  ON public.bots FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "bots_insert_own"
  ON public.bots FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "bots_update_own"
  ON public.bots FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "bots_delete_own"
  ON public.bots FOR DELETE
  USING (auth.uid() = user_id);


-- ============================================================
-- 4. pages  (owned via bot → user_id)
-- ============================================================
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pages_select_bot_owner"
  ON public.pages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bots
      WHERE bots.id = pages.bot_id
        AND bots.user_id = auth.uid()
    )
  );

CREATE POLICY "pages_insert_bot_owner"
  ON public.pages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bots
      WHERE bots.id = pages.bot_id
        AND bots.user_id = auth.uid()
    )
  );

CREATE POLICY "pages_update_bot_owner"
  ON public.pages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.bots
      WHERE bots.id = pages.bot_id
        AND bots.user_id = auth.uid()
    )
  );

CREATE POLICY "pages_delete_bot_owner"
  ON public.pages FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.bots
      WHERE bots.id = pages.bot_id
        AND bots.user_id = auth.uid()
    )
  );


-- ============================================================
-- 5. documents  (owned via bot → user_id)
--    INSERT / UPDATE are done exclusively by the indexer worker
--    (service_role), so no authenticated INSERT policy is needed.
-- ============================================================
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "documents_select_bot_owner"
  ON public.documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bots
      WHERE bots.id = documents.bot_id
        AND bots.user_id = auth.uid()
    )
  );

CREATE POLICY "documents_delete_bot_owner"
  ON public.documents FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.bots
      WHERE bots.id = documents.bot_id
        AND bots.user_id = auth.uid()
    )
  );

-- INSERT / UPDATE restricted to service_role (indexer worker).


-- ============================================================
-- 6. conversations  (owned via bot → user_id)
--    Widget visitors (anon) must be able to INSERT new conversations.
-- ============================================================
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conversations_select_bot_owner"
  ON public.conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bots
      WHERE bots.id = conversations.bot_id
        AND bots.user_id = auth.uid()
    )
  );

-- Widget visitors start new conversations without a user session.
CREATE POLICY "conversations_insert_anon"
  ON public.conversations FOR INSERT
  WITH CHECK (true);

CREATE POLICY "conversations_update_bot_owner"
  ON public.conversations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.bots
      WHERE bots.id = conversations.bot_id
        AND bots.user_id = auth.uid()
    )
  );

CREATE POLICY "conversations_delete_bot_owner"
  ON public.conversations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.bots
      WHERE bots.id = conversations.bot_id
        AND bots.user_id = auth.uid()
    )
  );


-- ============================================================
-- 7. messages  (owned via conversation → bot → user_id)
--    Widget visitors (anon) must be able to INSERT messages.
-- ============================================================
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "messages_select_bot_owner"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      JOIN public.bots b ON b.id = c.bot_id
      WHERE c.id = messages.conversation_id
        AND b.user_id = auth.uid()
    )
  );

-- Widget visitors and AI responses are inserted without a user session.
CREATE POLICY "messages_insert_anon"
  ON public.messages FOR INSERT
  WITH CHECK (true);

CREATE POLICY "messages_update_bot_owner"
  ON public.messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      JOIN public.bots b ON b.id = c.bot_id
      WHERE c.id = messages.conversation_id
        AND b.user_id = auth.uid()
    )
  );

CREATE POLICY "messages_delete_bot_owner"
  ON public.messages FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      JOIN public.bots b ON b.id = c.bot_id
      WHERE c.id = messages.conversation_id
        AND b.user_id = auth.uid()
    )
  );


-- ============================================================
-- 8. usage_logs  (owned via bot → user_id)
--    Widget visitors (anon) must be able to INSERT usage events.
-- ============================================================
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usage_logs_select_bot_owner"
  ON public.usage_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bots
      WHERE bots.id = usage_logs.bot_id
        AND bots.user_id = auth.uid()
    )
  );

-- Widget inserts a usage_log row on every chat message (no user session).
CREATE POLICY "usage_logs_insert_anon"
  ON public.usage_logs FOR INSERT
  WITH CHECK (true);

-- UPDATE / DELETE restricted to service_role.


-- ============================================================
-- 9. subscriptions  (one row per auth user)
--    Mutations are handled exclusively by payment processing / cron
--    (service_role), so only SELECT is exposed to authenticated users.
-- ============================================================
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscriptions_select_own"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT / UPDATE / DELETE restricted to service_role.


-- ============================================================
-- 10. wallets  (one row per auth user)
--     Balance mutations are handled by credit.service.ts via service_role.
-- ============================================================
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wallets_select_own"
  ON public.wallets FOR SELECT
  USING (auth.uid() = user_id);

-- UPDATE / DELETE restricted to service_role.


-- ============================================================
-- 11. payments  (one row per payment, linked to user via user_id)
--     Mutations are handled by payment callbacks / webhooks via service_role.
-- ============================================================
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payments_select_own"
  ON public.payments FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT / UPDATE / DELETE restricted to service_role.


-- ============================================================
-- 12. credit_transactions  (linked to user via user_id)
--     INSERTs are handled by credit.service.ts via service_role.
-- ============================================================
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "credit_transactions_select_own"
  ON public.credit_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT / DELETE restricted to service_role.


-- ============================================================
-- 13. jobs  (linked to a bot via bot_id, bot owned by user)
--     Mutations are handled by BullMQ workers via service_role.
-- ============================================================
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "jobs_select_bot_owner"
  ON public.jobs FOR SELECT
  USING (
    bot_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.bots
      WHERE bots.id = jobs.bot_id
        AND bots.user_id = auth.uid()
    )
  );

-- INSERT / UPDATE / DELETE restricted to service_role (BullMQ workers).
