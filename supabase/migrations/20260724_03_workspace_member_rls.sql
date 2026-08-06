-- Migration: Enable SELECT RLS policies for active Workspace Members on Core Workspace Assets
-- (workspaces, subscriptions, wallets, bots, pages)

-- 1. Subscriptions: Allow active workspace members to SELECT workspace subscription
CREATE POLICY "subscriptions_select_workspace_member"
ON public.subscriptions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_members.workspace_id = subscriptions.workspace_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.status = 'active'
  )
);

-- 2. Wallets: Allow active workspace members to SELECT workspace wallet
CREATE POLICY "wallets_select_workspace_member"
ON public.wallets FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_members.workspace_id = wallets.workspace_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.status = 'active'
  )
);

-- 3. Bots: Allow active workspace members to SELECT workspace bots
CREATE POLICY "bots_select_workspace_member"
ON public.bots FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_members.workspace_id = bots.workspace_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.status = 'active'
  )
);

-- 4. Pages: Allow active workspace members to SELECT workspace bot pages
CREATE POLICY "pages_select_workspace_member"
ON public.pages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.bots
    JOIN public.workspace_members ON workspace_members.workspace_id = bots.workspace_id
    WHERE bots.id = pages.bot_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.status = 'active'
  )
);

-- 5. Storage Objects: Allow active workspace members to upload/manage knowledge_files in storage.objects
CREATE POLICY "storage_objects_select_workspace_member"
ON storage.objects FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.bots
    JOIN public.workspace_members ON workspace_members.workspace_id = bots.workspace_id
    WHERE bots.id::text = (storage.foldername(name))[1]
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.status = 'active'
  )
);

CREATE POLICY "storage_objects_insert_workspace_member"
ON storage.objects FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.bots
    JOIN public.workspace_members ON workspace_members.workspace_id = bots.workspace_id
    WHERE bots.id::text = (storage.foldername(name))[1]
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.status = 'active'
  )
);

CREATE POLICY "storage_objects_update_workspace_member"
ON storage.objects FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.bots
    JOIN public.workspace_members ON workspace_members.workspace_id = bots.workspace_id
    WHERE bots.id::text = (storage.foldername(name))[1]
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.status = 'active'
  )
);

CREATE POLICY "storage_objects_delete_workspace_member"
ON storage.objects FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.bots
    JOIN public.workspace_members ON workspace_members.workspace_id = bots.workspace_id
    WHERE bots.id::text = (storage.foldername(name))[1]
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.status = 'active'
  )
);
