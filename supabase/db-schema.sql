CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$
;

DROP EVENT TRIGGER IF EXISTS ensure_rls;
CREATE EVENT TRIGGER ensure_rls
  ON ddl_command_end
  WHEN TAG IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
  EXECUTE FUNCTION public.rls_auto_enable();

CREATE OR REPLACE FUNCTION public.get_user_id_by_email(p_email text)
 RETURNS uuid
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $$
  SELECT id 
  FROM auth.users 
  WHERE LOWER(email) = LOWER(p_email)
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user_billing()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Subscriptions and wallets are workspace-scoped and created per-workspace in WorkspaceService.createWorkspace.
  RETURN NEW;
END;
$function$
;

-- Trigger function is only invoked by the trigger itself — revoke public EXECUTE
REVOKE EXECUTE ON FUNCTION public.handle_new_user_billing() FROM anon, authenticated;

DO $$ BEGIN
    CREATE TYPE public.invoice_status AS ENUM ('pending', 'issuing', 'issued', 'failed', 'cancelled', 'replaced');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.invoice_provider AS ENUM ('easyinvoice', 'misa_meinvoice');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.bot_status AS ENUM ('pending', 'discovering', 'discovered', 'indexing', 'ready', 'failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.page_status AS ENUM ('pending', 'processing', 'pending_index', 'ignored', 'completed', 'failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.page_error_type AS ENUM (
      'network_error',
      'timeout_error',
      'http_error',
      'rate_limited',
      'blocked',
      'parse_error',
      'render_error',
      'empty_content',
      'url_error',
      'not_found',
      'unknown_error'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.pricing_plan AS ENUM ('free', 'standard', 'pro', 'enterprise');
    CREATE TYPE public.billing_cycle AS ENUM ('monthly', 'yearly', 'none');
    CREATE TYPE public.payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
    CREATE TYPE public.payment_type AS ENUM ('subscription', 'payg', 'subscription_upgrade', 'subscription_renew');
    CREATE TYPE public.job_status AS ENUM ('pending', 'active', 'completed', 'failed');
    CREATE TYPE public.transaction_type AS ENUM (
      'subscription_renewal',
      'index_pages',
      'index_pages_refund',
      'chat_message',
      'chat_message_refund',
      'add_knowledge',
      'add_knowledge_refund',
      'update_knowledge',
      'update_knowledge_refund',
      'plan_downgrade',
      'monthly_reset',
      'payg_purchase'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- public.plans definition

CREATE TABLE public.plans (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	code public.pricing_plan NOT NULL,
	name text NOT NULL,
	bots_limit int4 DEFAULT 1 NOT NULL,
	monthly_credits int4 DEFAULT 1000 NOT NULL,
	description text NULL,
	pricing jsonb DEFAULT '{}'::jsonb NOT NULL,
	is_active bool DEFAULT true NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT plans_pkey PRIMARY KEY (id),
	CONSTRAINT plans_code_key UNIQUE (code),
	CONSTRAINT plans_monthly_credits_non_negative CHECK (monthly_credits >= 0),
	CONSTRAINT plans_bots_limit_positive CHECK (bots_limit > 0)
);

create trigger update_plans_updated_at before
update
    on
    public.plans for each row execute function update_updated_at_column();

INSERT INTO public.plans (code, name, bots_limit, monthly_credits, description, pricing, is_active)
VALUES
  (
    'free', 'Free', 1, 100, 'Starter plan for new users',
    '{"VND": {"monthly": 0, "yearly": 0}, "USD": {"monthly": 0, "yearly": 0}}'::jsonb,
    true
  ),
  (
    'standard', 'Standard', 2, 1000, 'Balanced plan for growing teams',
    '{"VND": {"monthly": 249000, "yearly": 2490000}, "USD": {"monthly": 9, "yearly": 90}}'::jsonb,
    true
  ),
  (
    'pro', 'Pro', 5, 5000, 'Advanced plan for high-usage teams',
    '{"VND": {"monthly": 499000, "yearly": 4990000}, "USD": {"monthly": 29, "yearly": 290}}'::jsonb,
    true
  ),
  (
    'enterprise', 'Enterprise', 50, 50000, 'Tự cấu hình số lượng bot và credits (thanh toán & áp dụng ngay)',
    '{"VND": {"monthly": 2900000, "yearly": 31320000}, "USD": {"monthly": 125, "yearly": 1350}}'::jsonb,
    true
  )
ON CONFLICT (code) DO UPDATE
SET
  name = EXCLUDED.name,
  bots_limit = EXCLUDED.bots_limit,
  monthly_credits = EXCLUDED.monthly_credits,
  description = EXCLUDED.description,
  pricing = EXCLUDED.pricing,
  is_active = EXCLUDED.is_active;

-- public.bots definition

-- Drop table

-- DROP TABLE public.bots;

CREATE TABLE public.bots (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	user_id uuid NOT NULL,
	name text NOT NULL,
	domain text NOT NULL,
	status public.bot_status DEFAULT 'pending',
	verification_token text NULL,
	verified_at timestamptz NULL,
	last_crawl_at timestamptz NULL,
	crawl_settings jsonb DEFAULT '{"language": "vi", "maxPages": 100, "excludePatterns": [], "includePatterns": []}'::jsonb NULL,
	widget_settings jsonb DEFAULT '{"position": "bottom-right", "primaryColor": "#3B82F6", "welcomeMessage": "Xin chào! Tôi có thể giúp gì cho bạn?", "suggestedQuestions": []}'::jsonb NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz DEFAULT now() NOT NULL,
	avatar_url text NULL, -- URL of the bot avatar image stored in Supabase Storage
	rate_limit_per_day int4 NULL, -- Maximum messages a single visitor can send per day (24h window)
	rate_limit_per_ip int4 NULL, -- Maximum messages from a single IP per day for DDoS protection
	is_stopped boolean NOT NULL DEFAULT false, -- Whether the bot is manually stopped by the owner
	slug text NULL, -- URL-friendly unique identifier for standalone chat page
	is_public boolean NOT NULL DEFAULT false, -- Whether the bot is accessible via public standalone link
	is_banned boolean NOT NULL DEFAULT false,
	allowed_domains text[] NOT NULL DEFAULT '{}'::text[], -- Domains allowed to embed this bot widget. Maximum 5 normalized hostnames.
	personality_id uuid NULL, -- FK to ai_personalities, controls bot personality
	pwa_updated_at timestamptz DEFAULT now() NOT NULL, -- Auto-updated only when name or avatar_url changes (for PWA versioning)
	CONSTRAINT bots_pkey PRIMARY KEY (id),
	CONSTRAINT bots_slug_key UNIQUE (slug),
	CONSTRAINT bots_allowed_domains_max_5 CHECK (cardinality(allowed_domains) <= 5)
);
CREATE INDEX idx_bots_rate_limits ON public.bots USING btree (id, rate_limit_per_day, rate_limit_per_ip);
CREATE INDEX idx_bots_slug ON public.bots USING btree (slug) WHERE slug IS NOT NULL;

-- Table Triggers

create trigger update_bots_updated_at before
update
    on
    public.bots for each row execute function update_updated_at_column();

CREATE OR REPLACE FUNCTION public.update_pwa_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.name IS DISTINCT FROM NEW.name OR OLD.avatar_url IS DISTINCT FROM NEW.avatar_url THEN
    NEW.pwa_updated_at = now();
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER update_bots_pwa_updated_at
  BEFORE UPDATE ON public.bots
  FOR EACH ROW
  EXECUTE FUNCTION public.update_pwa_updated_at_column();



-- public.ai_personalities definition

CREATE TABLE public.ai_personalities (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	name varchar NOT NULL,
	description text NULL,
	prompt_injection text NOT NULL,
	is_active boolean NOT NULL DEFAULT true,
	created_at timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT ai_personalities_pkey PRIMARY KEY (id),
	CONSTRAINT ai_personalities_name_key UNIQUE (name)
);

-- public.ai_skills definition

CREATE TABLE public.ai_skills (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	name varchar NOT NULL,
	description text NULL,
	prompt_injection text NOT NULL,
	is_active boolean NOT NULL DEFAULT true,
	created_at timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT ai_skills_pkey PRIMARY KEY (id),
	CONSTRAINT ai_skills_name_key UNIQUE (name)
);

-- public.bot_leads definition

CREATE TABLE public.bot_leads (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	bot_id uuid NOT NULL,
	visitor_session_id text NOT NULL,
	unanswered_question text NOT NULL,
	customer_name text NOT NULL,
	customer_email text NOT NULL,
	customer_phone text NULL,
	note text NULL,
	status text DEFAULT 'pending'::text NOT NULL,
	chat_history jsonb NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT bot_leads_pkey PRIMARY KEY (id),
	CONSTRAINT bot_leads_bot_id_fkey FOREIGN KEY (bot_id) REFERENCES public.bots(id) ON DELETE CASCADE
);
CREATE INDEX idx_bot_leads_bot_id ON public.bot_leads (bot_id);
CREATE INDEX idx_bot_leads_status ON public.bot_leads (status);
CREATE INDEX idx_bot_leads_bot_created ON public.bot_leads (bot_id, created_at DESC);

create trigger update_bot_leads_updated_at before
update
    on
    public.bot_leads for each row execute function update_updated_at_column();

-- public.bot_skills definition

CREATE TABLE public.bot_skills (
	bot_id uuid NOT NULL,
	skill_id uuid NOT NULL,
	sort_order smallint DEFAULT 0 NOT NULL,
	CONSTRAINT bot_skills_pkey PRIMARY KEY (bot_id, skill_id),
	CONSTRAINT bot_skills_bot_id_fkey FOREIGN KEY (bot_id) REFERENCES public.bots(id) ON DELETE CASCADE,
	CONSTRAINT bot_skills_skill_id_fkey FOREIGN KEY (skill_id) REFERENCES public.ai_skills(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_bot_skills_skill_id ON public.bot_skills (skill_id);

-- public.conversations definition

-- Drop table

-- DROP TABLE public.conversations;

CREATE TABLE public.conversations (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	bot_id uuid NOT NULL,
	visitor_id text NOT NULL,
	started_at timestamptz DEFAULT now() NOT NULL,
	ended_at timestamptz NULL,
	CONSTRAINT conversations_pkey PRIMARY KEY (id),
	CONSTRAINT conversations_bot_id_fkey FOREIGN KEY (bot_id) REFERENCES public.bots(id) ON DELETE CASCADE
);


-- public.documents definition

-- Kích hoạt extension hỗ trợ lưu trữ và tìm kiếm vector
create extension if not exists vector with schema public;

-- Drop table
-- DROP TABLE public.documents;

CREATE TABLE public.documents (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	bot_id uuid NOT NULL,
	content text NOT NULL,
	metadata jsonb DEFAULT '{}'::jsonb NULL,
	embedding public.vector(768) NULL,
    -- Thêm cột fts dùng từ điển 'simple'
	fts tsvector GENERATED ALWAYS AS (to_tsvector('simple', content)) STORED,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT documents_pkey PRIMARY KEY (id),
	CONSTRAINT documents_bot_id_fkey FOREIGN KEY (bot_id) REFERENCES public.bots(id) ON DELETE CASCADE
);

CREATE INDEX documents_bot_id_idx ON public.documents USING btree (bot_id);
CREATE INDEX documents_embedding_idx ON public.documents USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Table Triggers
create trigger on_documents_updated before
update
    on
    public.documents for each row execute function update_updated_at_column();


-- public.messages definition

-- Drop table

-- DROP TABLE public.messages;

CREATE TABLE public.messages (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	conversation_id uuid NOT NULL,
	role text NOT NULL,
	content text NOT NULL,
	no_answer bool DEFAULT false NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	prompt_tokens int4 DEFAULT 0 NOT NULL,
	completion_tokens int4 DEFAULT 0 NOT NULL,
	CONSTRAINT messages_pkey PRIMARY KEY (id),
	CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE
);

CREATE INDEX idx_messages_conversation_id ON public.messages (conversation_id);


-- public.pages definition

-- Drop table

-- DROP TABLE public.pages;

CREATE TABLE public.pages (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	bot_id uuid NOT NULL,
	url text NOT NULL,
  status public.page_status DEFAULT 'pending',
  source_type text NOT NULL DEFAULT 'website',
  depth int NULL,
	title text NULL,
	content text NULL,
	raw_content text NULL,
	content_hash text NULL,
	error_message text NULL,
	error_type public.page_error_type NULL, -- Categorized error type when status = 'failed'
	http_status_code int4 NULL,             -- HTTP status code returned by the server
	crawled_at timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT pages_pkey PRIMARY KEY (id),
	CONSTRAINT pages_bot_id_fkey FOREIGN KEY (bot_id) REFERENCES public.bots(id) ON DELETE CASCADE,
	CONSTRAINT pages_source_type_check CHECK (source_type IN ('website', 'manual_text', 'file', 'single_url'))
);

CREATE INDEX idx_pages_bot_id_url ON public.pages (bot_id, url);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pages_bot_id_url_unique ON public.pages (bot_id, url);
CREATE INDEX IF NOT EXISTS idx_pages_bot_status ON public.pages (bot_id, status);
CREATE INDEX IF NOT EXISTS idx_pages_bot_error_type ON public.pages (bot_id, error_type);
CREATE INDEX IF NOT EXISTS idx_pages_bot_crawled_at_desc ON public.pages (bot_id, crawled_at DESC);
CREATE INDEX IF NOT EXISTS idx_pages_source_type ON public.pages (source_type);
CREATE INDEX IF NOT EXISTS idx_pages_bot_id_source_type ON public.pages (bot_id, source_type);



-- public.usage_logs definition

-- Drop table

-- DROP TABLE public.usage_logs;

CREATE TABLE public.usage_logs (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	bot_id uuid NULL,
	action text NOT NULL,
	count int4 DEFAULT 1 NULL,
	visitor_id text NULL,
	client_ip text NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT usage_logs_pkey PRIMARY KEY (id),
	CONSTRAINT usage_logs_bot_id_fkey FOREIGN KEY (bot_id) REFERENCES public.bots(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_usage_logs_bot_visitor_action_created
  ON public.usage_logs (bot_id, visitor_id, action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_logs_bot_ip_action_created
  ON public.usage_logs (bot_id, client_ip, action, created_at DESC);



-- public.subscriptions definition

-- Drop table

-- DROP TABLE public.subscriptions;

CREATE TABLE public.subscriptions (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	user_id uuid NOT NULL,
	plan_id uuid NOT NULL,
	billing_cycle public.billing_cycle DEFAULT 'monthly'::public.billing_cycle,
	status text DEFAULT 'active',
	cancel_at_period_end bool DEFAULT false,
	current_period_start timestamptz DEFAULT now() NOT NULL,
	current_period_end timestamptz DEFAULT now() + '1 mon'::interval NOT NULL,
	next_credit_reset_at timestamptz DEFAULT now() + '1 mon'::interval NOT NULL,
	needs_bot_selection bool DEFAULT false NOT NULL,
	bots_limit_override int4 NULL,
	monthly_credits_override int4 NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT subscriptions_pkey PRIMARY KEY (id),
	CONSTRAINT subscriptions_user_id_key UNIQUE (user_id)
);

-- Table Triggers

create trigger update_subscriptions_updated_at before
update
    on
    public.subscriptions for each row execute function update_updated_at_column();

-- public.wallets definition

-- Wallets are keyed by workspace_id (each workspace has its own wallet).
-- user_id was removed: credits are workspace-scoped only.

CREATE TABLE public.wallets (
	workspace_id uuid NOT NULL,
	subscription_credits int4 DEFAULT 1000 NOT NULL,
	payg_credits int4 DEFAULT 0 NOT NULL,
	total_credits int4 GENERATED ALWAYS AS (subscription_credits + payg_credits) STORED,
	updated_at timestamptz DEFAULT now() NOT NULL,
	is_payg_enabled bool DEFAULT false,
	CONSTRAINT wallets_pkey PRIMARY KEY (workspace_id),
	CONSTRAINT wallets_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE
);

create trigger update_wallets_updated_at before
update
    on
    public.wallets for each row execute function update_updated_at_column();

-- public.payments definition

CREATE TABLE public.payments (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	user_id uuid NOT NULL,
	amount int8 NOT NULL,
	currency text DEFAULT 'VND',
	status public.payment_status DEFAULT 'pending'::public.payment_status,
	payment_type public.payment_type NOT NULL,
	provider text NOT NULL,
	provider_transaction_id text NULL,
	metadata jsonb DEFAULT '{}'::jsonb,
	plan_id uuid NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT payments_pkey PRIMARY KEY (id),
	CONSTRAINT payments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
	CONSTRAINT payments_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.plans(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_payments_plan_id ON public.payments (plan_id);

create trigger update_payments_updated_at before
update
    on
    public.payments for each row execute function update_updated_at_column();

-- public.invoices definition

CREATE TABLE IF NOT EXISTS public.invoices (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	payment_id uuid NOT NULL,
	user_id uuid NOT NULL,
	company_name text NOT NULL,
	company_tax_code text NOT NULL,
	company_address text NOT NULL,
	recipient_email text NOT NULL,
	status public.invoice_status DEFAULT 'pending' NOT NULL,
	line_items jsonb DEFAULT '[]'::jsonb NOT NULL,
	provider public.invoice_provider DEFAULT 'easyinvoice' NOT NULL,
	provider_ref_id text NULL,
	provider_pattern text NULL,
	provider_serial text NULL,
	provider_invoice_no text NULL,
	provider_lookup_code text NULL,
	link_view text NULL,
	tax_authority_status text NULL,
	tax_authority_error text NULL,
	error_message text NULL,
	retry_count integer DEFAULT 0 NOT NULL,
	issued_at timestamptz NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT invoices_pkey PRIMARY KEY (id),
	CONSTRAINT invoices_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments(id) ON DELETE RESTRICT,
	CONSTRAINT invoices_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
	CONSTRAINT invoices_tax_code_format CHECK (company_tax_code ~ '^[0-9]{10}(-[0-9]{3})?$')
);

CREATE INDEX IF NOT EXISTS idx_invoices_payment_id ON public.invoices (payment_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON public.invoices (user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices (status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_payment_id_active
  ON public.invoices (payment_id)
  WHERE status NOT IN ('cancelled', 'replaced');

create trigger update_invoices_updated_at before
update
    on
    public.invoices for each row execute function update_updated_at_column();

-- public.credit_transactions definition

CREATE TABLE public.credit_transactions (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	user_id uuid NULL,
	payment_id uuid NULL,
	workspace_id uuid NULL,
	amount int4 NOT NULL,
	transaction_type public.transaction_type NOT NULL,
	description text NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT credit_transactions_pkey PRIMARY KEY (id),
	CONSTRAINT credit_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
	CONSTRAINT credit_transactions_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments(id) ON DELETE SET NULL,
	CONSTRAINT credit_transactions_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_created_at
  ON public.credit_transactions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_type_created_at
  ON public.credit_transactions (user_id, transaction_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_payment_id
  ON public.credit_transactions (payment_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_workspace
  ON public.credit_transactions (workspace_id);

-- public.jobs definition

CREATE TABLE public.jobs (
	id text NOT NULL,
	bot_id uuid NULL,
	name text NOT NULL,
	status public.job_status NOT NULL DEFAULT 'pending',
	progress int4 NOT NULL DEFAULT 0,
	data jsonb NOT NULL DEFAULT '{}'::jsonb,
	error_message text NULL,
	created_at timestamptz NOT NULL DEFAULT now(),
	started_at timestamptz NULL,
	finished_at timestamptz NULL,
	CONSTRAINT jobs_pkey PRIMARY KEY (id),
	CONSTRAINT jobs_bot_id_fkey FOREIGN KEY (bot_id) REFERENCES public.bots(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_jobs_bot_id     ON public.jobs (bot_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status     ON public.jobs (status);
CREATE INDEX IF NOT EXISTS idx_jobs_name       ON public.jobs (name);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON public.jobs (created_at DESC);

-- public.credit_packages definition

CREATE TABLE public.credit_packages (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	name text NOT NULL,
	credits_amount int4 NOT NULL,
	price jsonb DEFAULT '{"USD": 0, "VND": 0}'::jsonb NULL,
	is_active bool DEFAULT true NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT credit_packages_pkey PRIMARY KEY (id)
);

create trigger update_credit_packages_updated_at before
update
    on
    public.credit_packages for each row execute function update_updated_at_column();

-- public.admin_users definition

CREATE TABLE public.admin_users (
	id uuid NOT NULL,
	email text NOT NULL,
	otp_code text NULL,
	otp_expires_at timestamptz NULL,
	role text DEFAULT 'admin'::text NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT admin_users_pkey PRIMARY KEY (id),
	CONSTRAINT admin_users_email_key UNIQUE (email),
	CONSTRAINT admin_users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- public.support_tickets definition

CREATE TABLE public.support_tickets (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	user_id uuid NULL,
	subject text NOT NULL,
	message text NOT NULL,
	status text DEFAULT 'open'::text NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	admin_response text NULL,
	resolved_at timestamptz NULL,
	CONSTRAINT support_tickets_pkey PRIMARY KEY (id),
	CONSTRAINT support_tickets_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Table Triggers
create trigger send_ticket_notification after
insert
    on
    public.support_tickets for each row execute function supabase_functions.http_request(
      'https://admin-portal.vielora.vn/api/webhooks/support-ticket',
      'POST',
      '{"Authorization":"Bearer <your_webhook_secret>"}',
      '{}',
      '5000'
    );

-- public.discounts definition

CREATE TABLE public.discounts (
	code text NOT NULL,
	discount_value numeric NOT NULL,
	type text NOT NULL,
	is_active boolean DEFAULT true NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT discounts_pkey PRIMARY KEY (code),
	CONSTRAINT discounts_type_check CHECK (type = ANY (ARRAY['percent'::text, 'fixed'::text]))
);

-- public.banned_users definition

CREATE TABLE public.banned_users (
	user_id uuid NOT NULL,
	reason text NULL,
	banned_at timestamptz DEFAULT now() NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT banned_users_pkey PRIMARY KEY (user_id),
	CONSTRAINT banned_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- public.categories definition

CREATE TABLE public.categories (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	name text NOT NULL,
	slug text NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT categories_pkey PRIMARY KEY (id),
	CONSTRAINT categories_name_key UNIQUE (name),
	CONSTRAINT categories_slug_key UNIQUE (slug)
);

-- public.posts definition

CREATE TABLE public.posts (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	title text NOT NULL,
	slug text NOT NULL,
	summary text NOT NULL,
	thumbnail_url text NULL,
	content text NOT NULL,
	status text DEFAULT 'draft'::text NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz DEFAULT now() NOT NULL,
	published_at timestamptz NULL,
	CONSTRAINT posts_pkey PRIMARY KEY (id),
	CONSTRAINT posts_slug_key UNIQUE (slug),
	CONSTRAINT posts_status_check CHECK (status = ANY (ARRAY['draft'::text, 'published'::text]))
);

-- public.post_categories definition

CREATE TABLE public.post_categories (
	post_id uuid NOT NULL,
	category_id uuid NOT NULL,
	CONSTRAINT post_categories_pkey PRIMARY KEY (post_id, category_id),
	CONSTRAINT post_categories_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE,
	CONSTRAINT post_categories_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE
);

-- public.shopify_sessions_migrations definition

CREATE TABLE public.shopify_sessions_migrations (
	migration_name varchar NOT NULL,
	CONSTRAINT shopify_sessions_migrations_pkey PRIMARY KEY (migration_name)
);

-- public.shopify_sessions definition

CREATE TABLE public.shopify_sessions (
	id varchar NOT NULL,
	shop varchar NOT NULL,
	state varchar NOT NULL,
	"isOnline" bool NOT NULL,
	scope varchar NULL,
	expires int4 NULL,
	"accessToken" varchar NULL,
	"refreshToken" varchar NULL,
	"refreshTokenExpires" int8 NULL,
	"userId" int8 NULL,
	"firstName" varchar NULL,
	"lastName" varchar NULL,
	email varchar NULL,
	"accountOwner" bool NULL,
	locale varchar NULL,
	collaborator bool NULL,
	"emailVerified" bool NULL,
	CONSTRAINT shopify_sessions_pkey PRIMARY KEY (id)
);

-- public.bots foreign keys

ALTER TABLE public.bots ADD CONSTRAINT bots_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.bots ADD CONSTRAINT bots_personality_id_fkey FOREIGN KEY (personality_id) REFERENCES public.ai_personalities(id) ON DELETE SET NULL;


-- public.subscriptions foreign keys

ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.plans(id);

CREATE TRIGGER on_auth_user_created_billing AFTER
INSERT
    ON
    auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_billing();


-- ============================================================
-- ROW LEVEL SECURITY (ENTERPRISE STANDARD)
-- Bắt buộc bật cho 100% các bảng để chống lộ lọt qua anon_key
-- ============================================================

-- BẬT RLS CHO TẤT CẢ CÁC BẢNG
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banned_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopify_sessions_migrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopify_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_personalities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- 1. PLANS (Public Read-only)
CREATE POLICY "plans_select_all" ON public.plans FOR SELECT USING (true);

-- 2. DỮ LIỆU CÁ NHÂN (Profiles, Bots)
CREATE POLICY "bots_all_own" ON public.bots FOR ALL USING (auth.uid() = user_id);

-- Public PWA branding: anonymous users can read public bot branding metadata
CREATE POLICY "bots_select_public_pwa_branding"
  ON public.bots FOR SELECT
  TO anon
  USING (is_public = true AND slug IS NOT NULL);

REVOKE SELECT ON TABLE public.bots FROM anon;
GRANT SELECT (slug, name, widget_settings, avatar_url, pwa_updated_at) ON TABLE public.bots TO anon;

-- 3. DỮ LIỆU TÀI CHÍNH (Chỉ Read-only từ Client, Update qua Backend Service Role)
CREATE POLICY "subscriptions_select_own" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "wallets_select_workspace_member" ON public.wallets FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_members.workspace_id = wallets.workspace_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.status = 'active'
  )
);
CREATE POLICY "payments_select_own" ON public.payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "credit_transactions_select_own" ON public.credit_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "invoices_select_own" ON public.invoices FOR SELECT USING (auth.uid() = user_id);

-- 4. DỮ LIỆU LIÊN KẾT (Cần xác thực qua bot_id)
-- Người dùng chỉ được CRUD dữ liệu nếu họ là chủ của Bot đó
CREATE POLICY "pages_all_own" ON public.pages FOR ALL USING (
  EXISTS (SELECT 1 FROM public.bots WHERE bots.id = pages.bot_id AND bots.user_id = auth.uid())
);

CREATE POLICY "documents_all_own" ON public.documents FOR ALL USING (
  EXISTS (SELECT 1 FROM public.bots WHERE bots.id = documents.bot_id AND bots.user_id = auth.uid())
);

CREATE POLICY "conversations_all_own" ON public.conversations FOR ALL USING (
  EXISTS (SELECT 1 FROM public.bots WHERE bots.id = conversations.bot_id AND bots.user_id = auth.uid())
);

CREATE POLICY "usage_logs_select_own" ON public.usage_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.bots WHERE bots.id = usage_logs.bot_id AND bots.user_id = auth.uid())
);

CREATE POLICY "jobs_select_own" ON public.jobs FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.bots WHERE bots.id = jobs.bot_id AND bots.user_id = auth.uid())
);

ALTER publication supabase_realtime ADD TABLE public.bots;

-- 5. MESSAGES (Liên kết qua conversation_id -> bot_id)
CREATE POLICY "messages_all_own" ON public.messages FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.conversations c 
    JOIN public.bots b ON c.bot_id = b.id 
    WHERE c.id = messages.conversation_id AND b.user_id = auth.uid()
  )
);

-- 6. CREDIT PACKAGES (Public Read-only for active packages)
CREATE POLICY "Cho phép đọc các gói active" ON public.credit_packages FOR SELECT USING (is_active = true);

-- 7. ADMIN / SUPPORT TABLES
CREATE POLICY "Allow service role all operations" ON public.admin_users
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow service role all operations" ON public.support_tickets
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "support_tickets_select_own" ON public.support_tickets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "support_tickets_insert_own" ON public.support_tickets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow service role all operations" ON public.discounts
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow service role all operations" ON public.banned_users
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 8. BLOG TABLES (Public Read + Service Role)
CREATE POLICY "Allow public read categories" ON public.categories FOR SELECT TO public USING (true);
CREATE POLICY "Allow service role all operations on categories" ON public.categories FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read published posts" ON public.posts
  FOR SELECT TO public USING (status = 'published'::text);
CREATE POLICY "Allow service role all operations on posts" ON public.posts
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read post_categories" ON public.post_categories FOR SELECT TO public USING (true);
CREATE POLICY "Allow service role all operations on post_categories" ON public.post_categories FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 10. INVOICES (Read-only from client, mutations via service_role)
REVOKE INSERT, UPDATE, DELETE ON TABLE public.invoices FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.invoices FROM anon;

-- 9. AI CUSTOMIZATION TABLES

-- Catalog: authenticated users can read personalities
CREATE POLICY "ai_personalities_select_authenticated" ON public.ai_personalities
  FOR SELECT TO authenticated USING (true);

-- Catalog: authenticated users can read skills
CREATE POLICY "ai_skills_select_authenticated" ON public.ai_skills
  FOR SELECT TO authenticated USING (true);

-- Junction: bot owners manage their own skill mappings
CREATE POLICY "bot_skills_all_own" ON public.bot_skills FOR ALL USING (
  EXISTS (SELECT 1 FROM public.bots WHERE bots.id = bot_skills.bot_id AND bots.user_id = auth.uid())
);

-- Bot Leads: bot owners manage their own leads
CREATE POLICY "bot_leads_own" ON public.bot_leads FOR ALL USING (
  EXISTS (SELECT 1 FROM public.bots WHERE bots.id = bot_leads.bot_id AND bots.user_id = auth.uid())
);

-- ============================================
-- WORKSPACE FEATURE: Migration 01 — Core Tables
-- ============================================

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

-- ============================================
-- WORKSPACE FEATURE: Migration 02 — Triggers & Quota Enforcement
-- ============================================

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

-- ============================================
-- WORKSPACE FEATURE: Migration 03 — Schema Modifications
-- ============================================

-- Migration: Knowledge, Webhook, and Multi-Tenant Schema Modifications
-- Task 1.3: Knowledge, Webhook, and Helper Schema Modification

-- 1. Extend Existing Tables with workspace_id
ALTER TABLE public.bots
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL;

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL;

ALTER TABLE public.credit_transactions
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

ALTER TABLE public.usage_logs
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL;

-- Create Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_bots_workspace ON public.bots(workspace_id);
CREATE INDEX IF NOT EXISTS idx_payments_workspace ON public.payments(workspace_id);
CREATE INDEX IF NOT EXISTS idx_invoices_workspace ON public.invoices(workspace_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_workspace ON public.credit_transactions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_workspace ON public.usage_logs(workspace_id);

-- 2. Extend Plans Table
ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS max_members INT DEFAULT 5,
  ADD COLUMN IF NOT EXISTS max_shared_knowledge_items INT, -- NULL = unlimited
  ADD COLUMN IF NOT EXISTS max_webhooks INT DEFAULT 10,
  ADD COLUMN IF NOT EXISTS max_bot_private_knowledge INT DEFAULT 500;

-- Update Plans Limit Configuration
UPDATE public.plans SET max_members = 1, max_shared_knowledge_items = NULL, max_webhooks = 2, max_bot_private_knowledge = 100 WHERE code = 'free';
UPDATE public.plans SET max_members = 5, max_shared_knowledge_items = 1000, max_webhooks = 5, max_bot_private_knowledge = 500 WHERE code = 'standard';
UPDATE public.plans SET max_members = 20, max_shared_knowledge_items = 5000, max_webhooks = 10, max_bot_private_knowledge = 2000 WHERE code = 'pro';

-- 3. Create Shared Workspace Knowledge Table
CREATE TABLE IF NOT EXISTS public.workspace_knowledge (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    source_type TEXT DEFAULT 'file',
    metadata JSONB DEFAULT '{}'::jsonb,
    embedding vector(1536),
    status TEXT DEFAULT 'active',
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workspace_knowledge_workspace ON public.workspace_knowledge(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_knowledge_embedding ON public.workspace_knowledge USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Trigger for Shared Workspace Knowledge Limits
CREATE OR REPLACE FUNCTION public.enforce_workspace_knowledge_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_plan_limit INT;
  v_current_count INT;
BEGIN
  SELECT p.max_shared_knowledge_items INTO v_plan_limit
  FROM public.subscriptions s
  JOIN public.plans p ON s.plan_id = p.id
  WHERE s.workspace_id = NEW.workspace_id AND s.status = 'active';

  -- NULL means unlimited
  IF v_plan_limit IS NOT NULL THEN
    SELECT COUNT(*) INTO v_current_count
    FROM public.workspace_knowledge
    WHERE workspace_id = NEW.workspace_id;

    IF v_current_count >= v_plan_limit THEN
      RAISE EXCEPTION 'Workspace knowledge limit reached (% items max)', v_plan_limit;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_workspace_knowledge_limit ON public.workspace_knowledge;
CREATE TRIGGER trg_enforce_workspace_knowledge_limit
  BEFORE INSERT ON public.workspace_knowledge
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_workspace_knowledge_limit();

-- 4. Create Bot Private Knowledge Table
CREATE TABLE IF NOT EXISTS public.bot_knowledge (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bot_id UUID NOT NULL REFERENCES public.bots(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    source_type TEXT DEFAULT 'file',
    metadata JSONB DEFAULT '{}'::jsonb,
    embedding vector(1536),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bot_knowledge_bot ON public.bot_knowledge(bot_id);
CREATE INDEX IF NOT EXISTS idx_bot_knowledge_workspace ON public.bot_knowledge(workspace_id);
CREATE INDEX IF NOT EXISTS idx_bot_knowledge_embedding ON public.bot_knowledge USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- 5. Create Workspace Webhooks Table
CREATE TABLE IF NOT EXISTS public.workspace_webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    secret TEXT NOT NULL,
    events TEXT[] NOT NULL DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workspace_webhooks_workspace ON public.workspace_webhooks(workspace_id);

-- Trigger for Max Webhooks Limit (Max 10 per workspace)
CREATE OR REPLACE FUNCTION public.enforce_max_webhooks_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_count INT;
BEGIN
  IF NEW.is_active = true THEN
    SELECT COUNT(*) INTO v_count
    FROM public.workspace_webhooks
    WHERE workspace_id = NEW.workspace_id AND is_active = true;

    IF v_count >= 10 THEN
      RAISE EXCEPTION 'Maximum limit of 10 active webhooks reached per workspace';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_max_webhooks_limit ON public.workspace_webhooks;
CREATE TRIGGER trg_enforce_max_webhooks_limit
  BEFORE INSERT OR UPDATE ON public.workspace_webhooks
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_max_webhooks_limit();

-- ============================================
-- WORKSPACE FEATURE: Migration 04 — Workspace Member RLS
-- ============================================

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

-- ============================================
-- WORKSPACE FEATURE: Migration 06 — Workspace Billing Fix
-- ============================================

-- Migration: Add workspace_id column & backfill for subscriptions and wallets tables
-- Task B1: Billing multi-tenancy schema & backfill fix

-- 1. Ensure workspace_id on subscriptions (wallets already has workspace_id as PK)
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- Wallets table now uses workspace_id as PRIMARY KEY (no user_id column).
-- The ALTER TABLE below is a no-op if run after the wallets table creation above.
ALTER TABLE public.wallets
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- 2. Indexes and Unique Constraints
CREATE INDEX IF NOT EXISTS idx_subscriptions_workspace ON public.subscriptions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_wallets_workspace ON public.wallets(workspace_id);

-- Unique constraint on subscriptions.workspace_id (one active subscription per workspace)
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_workspace_id_key
  ON public.subscriptions (workspace_id);

-- 3. Backfill workspace_id for existing subscriptions (wallets are created per-workspace,
-- so no backfill needed for wallets; user_id column was removed).
UPDATE public.subscriptions s
SET workspace_id = w.id
FROM public.workspaces w
WHERE s.workspace_id IS NULL AND w.owner_id = s.user_id;
