-- Social Studio (Texto em Ciclo) tables for Supabase
-- Run this in Supabase Dashboard -> SQL Editor

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
  theme jsonb not null,
  updated_at timestamptz not null default now()
);

-- Keep tables private to server-side service role key
alter table public.social_posts enable row level security;
alter table public.social_settings enable row level security;
