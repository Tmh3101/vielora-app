-- Migration: Workspace Core Tables Creation
-- Task 1.1: Core Tables (Workspaces, Members, Roles, Invitations)

-- 1. Create Custom Enums
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'workspace_status') THEN
        CREATE TYPE workspace_status AS ENUM ('active', 'suspended', 'deleted');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'member_status') THEN
        CREATE TYPE member_status AS ENUM ('pending', 'active', 'suspended', 'removed');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invitation_status') THEN
        CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'expired', 'revoked');
    END IF;
END $$;

-- 2. Create Workspaces Table
CREATE TABLE IF NOT EXISTS public.workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    owner_id UUID NOT NULL REFERENCES auth.users(id),
    plan_id UUID NOT NULL REFERENCES public.plans(id),
    billing_cycle billing_cycle DEFAULT 'monthly',
    status workspace_status DEFAULT 'active',
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT valid_slug CHECK (slug ~ '^[a-z0-9-]+$')
);

-- 3. Create Workspace Roles Table
CREATE TABLE IF NOT EXISTS public.workspace_roles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    permissions JSONB NOT NULL,
    hierarchy INT NOT NULL,
    is_system BOOLEAN DEFAULT true
);

-- 4. Create Workspace Members Table
CREATE TABLE IF NOT EXISTS public.workspace_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role_id TEXT NOT NULL REFERENCES public.workspace_roles(id) DEFAULT 'member',
    invited_by UUID REFERENCES auth.users(id),
    invited_at TIMESTAMPTZ DEFAULT now(),
    accepted_at TIMESTAMPTZ,
    status member_status DEFAULT 'pending',
    CONSTRAINT unique_workspace_user UNIQUE (workspace_id, user_id)
);

-- 5. Create Workspace Invitations Table
CREATE TABLE IF NOT EXISTS public.workspace_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role_id TEXT NOT NULL REFERENCES public.workspace_roles(id) DEFAULT 'member',
    invited_by UUID NOT NULL REFERENCES auth.users(id),
    token TEXT NOT NULL UNIQUE,
    token_expires_at TIMESTAMPTZ NOT NULL,
    status invitation_status DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now(),
    accepted_at TIMESTAMPTZ,
    accepted_by UUID REFERENCES auth.users(id)
);

-- 6. Seed System Roles
INSERT INTO public.workspace_roles (id, name, description, permissions, hierarchy, is_system)
VALUES
    ('owner', 'Workspace Owner', 'Full control over workspace, billing, members, and deletion', '{"billing": true, "invite": true, "remove": true, "settings": true, "knowledge": true, "bot_create": true, "workspace_delete": true}'::jsonb, 100, true),
    ('admin', 'Workspace Admin', 'Can manage settings, members, knowledge, and bots. Cannot delete workspace or manage billing', '{"billing": false, "invite": true, "remove": true, "settings": true, "knowledge": true, "bot_create": true, "workspace_delete": false}'::jsonb, 80, true),
    ('member', 'Workspace Member', 'Can access and contribute to knowledge base and use bots', '{"billing": false, "invite": false, "remove": false, "settings": false, "knowledge": true, "bot_create": false, "workspace_delete": false}'::jsonb, 50, true),
    ('viewer', 'Workspace Viewer', 'Read-only access to workspace assets', '{"billing": false, "invite": false, "remove": false, "settings": false, "knowledge": false, "bot_create": false, "workspace_delete": false}'::jsonb, 10, true)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    permissions = EXCLUDED.permissions,
    hierarchy = EXCLUDED.hierarchy,
    is_system = EXCLUDED.is_system;

-- Indexing for fast lookups
CREATE INDEX IF NOT EXISTS idx_workspaces_owner ON public.workspaces(owner_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON public.workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace ON public.workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_invitations_token ON public.workspace_invitations(token);
CREATE INDEX IF NOT EXISTS idx_workspace_invitations_email ON public.workspace_invitations(email);
