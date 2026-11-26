-- Social Studio / Comas (Texto em Ciclo) · Supabase Schema (idempotente)
-- Cole e execute este script no SQL Editor do seu projeto no Supabase Dashboard.

create table if not exists public.social_posts (
  id text primary key,
  title text not null,
  format text not null default 'carousel',
  status text not null default 'in_review',
  slides jsonb not null default '[]'::jsonb,
  caption text not null default '',
  source_idea text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists social_posts_updated_at_idx
  on public.social_posts (updated_at desc);

create table if not exists public.social_settings (
  id text primary key,
  theme jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Segurança: bloqueia acesso público (anon/authenticated) e libera apenas o servidor (service_role)
alter table public.social_posts enable row level security;
alter table public.social_settings enable row level security;

revoke all on table public.social_posts from public, anon, authenticated;
revoke all on table public.social_settings from public, anon, authenticated;

grant all on table public.social_posts to service_role;
grant all on table public.social_settings to service_role;
