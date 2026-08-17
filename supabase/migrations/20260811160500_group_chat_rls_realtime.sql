-- Migration: 20260811160500_group_chat_rls_realtime.sql
-- Description: RLS policies and Realtime publication for Group Chat (spec §3.8-3.9)

-- 1. Helper Functions

-- Bot Manager check: bot owner OR active workspace owner/admin (hierarchy >= 80)
CREATE OR REPLACE FUNCTION public.is_bot_manager(p_bot_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.bots b
    WHERE b.id = p_bot_id
      AND (
        b.user_id = p_user_id
        OR EXISTS (
          SELECT 1
          FROM public.workspace_members wm
          JOIN public.workspace_roles wr ON wr.id = wm.role_id
          WHERE wm.workspace_id = b.workspace_id
            AND wm.user_id = p_user_id
            AND wm.status = 'active'
            AND wr.hierarchy >= 80
        )
      )
  );
$$;

-- Group Member check
CREATE OR REPLACE FUNCTION public.is_group_member(p_group_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members WHERE group_id = p_group_id AND user_id = p_user_id
  );
$$;

-- 2. Enable RLS on all 5 tables
ALTER TABLE public.group_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_chat_insights ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies

-- group_chats: manager full access; members select
DROP POLICY IF EXISTS "group_chats_manager_all" ON public.group_chats;
CREATE POLICY "group_chats_manager_all" ON public.group_chats FOR ALL
  USING (public.is_bot_manager(bot_id, auth.uid()))
  WITH CHECK (public.is_bot_manager(bot_id, auth.uid()));

DROP POLICY IF EXISTS "group_chats_member_select" ON public.group_chats;
CREATE POLICY "group_chats_member_select" ON public.group_chats FOR SELECT
  USING (public.is_group_member(id, auth.uid()));

-- group_members: manager full access; members select roster; self-leave
DROP POLICY IF EXISTS "group_members_manager_all" ON public.group_members;
CREATE POLICY "group_members_manager_all" ON public.group_members FOR ALL
  USING (public.is_bot_manager((SELECT bot_id FROM public.group_chats WHERE id = group_id), auth.uid()))
  WITH CHECK (public.is_bot_manager((SELECT bot_id FROM public.group_chats WHERE id = group_id), auth.uid()));

DROP POLICY IF EXISTS "group_members_self_select" ON public.group_members;
CREATE POLICY "group_members_self_select" ON public.group_members FOR SELECT
  USING (public.is_group_member(group_id, auth.uid()));

DROP POLICY IF EXISTS "group_members_self_leave" ON public.group_members;
CREATE POLICY "group_members_self_leave" ON public.group_members FOR DELETE
  USING (user_id = auth.uid());

-- group_messages: members select; human member insert
DROP POLICY IF EXISTS "group_messages_member_select" ON public.group_messages;
CREATE POLICY "group_messages_member_select" ON public.group_messages FOR SELECT
  USING (public.is_group_member(group_id, auth.uid())
    OR public.is_bot_manager((SELECT bot_id FROM public.group_chats WHERE id = group_id), auth.uid()));

DROP POLICY IF EXISTS "group_messages_member_insert" ON public.group_messages;
CREATE POLICY "group_messages_member_insert" ON public.group_messages FOR INSERT
  WITH CHECK (public.is_group_member(group_id, auth.uid()) AND sender_type = 'user' AND sender_id = auth.uid());

-- chat_knowledge / group_chat_insights: manager-only
DROP POLICY IF EXISTS "chat_knowledge_manager_all" ON public.chat_knowledge;
CREATE POLICY "chat_knowledge_manager_all" ON public.chat_knowledge FOR ALL
  USING (public.is_bot_manager(bot_id, auth.uid()))
  WITH CHECK (public.is_bot_manager(bot_id, auth.uid()));

DROP POLICY IF EXISTS "group_chat_insights_manager_select" ON public.group_chat_insights;
CREATE POLICY "group_chat_insights_manager_select" ON public.group_chat_insights FOR SELECT
  USING (public.is_bot_manager(bot_id, auth.uid()));

-- 4. Realtime Publication
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.group_messages;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
