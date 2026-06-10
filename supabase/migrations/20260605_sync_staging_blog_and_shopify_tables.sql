-- Sync local Supabase schema snapshots with the existing staging project
-- cykshrevwqfcduuqrreu without modifying the remote project directly.

begin;

create table if not exists public.categories (
  id uuid default gen_random_uuid() not null,
  name text not null,
  slug text not null,
  created_at timestamptz default now() not null,
  constraint categories_pkey primary key (id),
  constraint categories_name_key unique (name),
  constraint categories_slug_key unique (slug)
);

create table if not exists public.posts (
  id uuid default gen_random_uuid() not null,
  title text not null,
  slug text not null,
  summary text not null,
  thumbnail_url text null,
  content text not null,
  status text default 'draft'::text not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  published_at timestamptz null,
  constraint posts_pkey primary key (id),
  constraint posts_slug_key unique (slug),
  constraint posts_status_check check (status = any (array['draft'::text, 'published'::text]))
);

drop trigger if exists update_posts_updated_at on public.posts;
create trigger update_posts_updated_at before update on public.posts
for each row execute function public.update_updated_at_column();

create table if not exists public.post_categories (
  post_id uuid not null,
  category_id uuid not null,
  constraint post_categories_pkey primary key (post_id, category_id),
  constraint post_categories_post_id_fkey foreign key (post_id) references public.posts(id) on delete cascade,
  constraint post_categories_category_id_fkey foreign key (category_id) references public.categories(id) on delete cascade
);

create table if not exists public.shopify_sessions_migrations (
  migration_name varchar not null,
  constraint shopify_sessions_migrations_pkey primary key (migration_name)
);

create table if not exists public.shopify_sessions (
  id varchar not null,
  shop varchar not null,
  state varchar not null,
  "isOnline" boolean not null,
  scope varchar null,
  expires int4 null,
  "accessToken" varchar null,
  "refreshToken" varchar null,
  "refreshTokenExpires" int8 null,
  "userId" int8 null,
  "firstName" varchar null,
  "lastName" varchar null,
  email varchar null,
  "accountOwner" boolean null,
  locale varchar null,
  collaborator boolean null,
  "emailVerified" boolean null,
  constraint shopify_sessions_pkey primary key (id)
);

alter table public.categories enable row level security;
alter table public.posts enable row level security;
alter table public.post_categories enable row level security;
alter table public.shopify_sessions_migrations enable row level security;
alter table public.shopify_sessions enable row level security;

drop policy if exists "categories_select_all" on public.categories;
create policy "categories_select_all" on public.categories
  for select using (true);

drop policy if exists "posts_select_published" on public.posts;
create policy "posts_select_published" on public.posts
  for select using (status = 'published'::text);

drop policy if exists "post_categories_select_all" on public.post_categories;
create policy "post_categories_select_all" on public.post_categories
  for select using (true);

commit;
