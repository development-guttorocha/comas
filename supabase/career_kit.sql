-- Kit de Clareza de Carreira · Autenticação por token no e-mail e caderno salvo na nuvem (idempotente)
-- Privacidade e segurança:
--   RLS ativada sem políticas para anon/authenticated; todo acesso acontece no servidor
--   via Secret / Service Role Key.

create table if not exists public.career_kit_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null default '',
  opt_in boolean not null default false,
  verified_at timestamptz null,
  last_login_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.career_kit_tokens (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  name text not null default '',
  opt_in boolean not null default false,
  code_hash text not null,
  attempts integer not null default 0 check (attempts >= 0 and attempts <= 10),
  expires_at timestamptz not null,
  consumed_at timestamptz null,
  created_at timestamptz not null default now()
);

create index if not exists idx_career_kit_tokens_email_created
  on public.career_kit_tokens (email, created_at desc);

create table if not exists public.career_kit_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.career_kit_users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz null,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_career_kit_sessions_user
  on public.career_kit_sessions (user_id, expires_at desc);

create table if not exists public.career_kit_workbooks (
  user_id uuid primary key references public.career_kit_users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.career_kit_users enable row level security;
alter table public.career_kit_tokens enable row level security;
alter table public.career_kit_sessions enable row level security;
alter table public.career_kit_workbooks enable row level security;

revoke all on table public.career_kit_users from public, anon, authenticated;
revoke all on table public.career_kit_tokens from public, anon, authenticated;
revoke all on table public.career_kit_sessions from public, anon, authenticated;
revoke all on table public.career_kit_workbooks from public, anon, authenticated;

grant all on table public.career_kit_users to service_role;
grant all on table public.career_kit_tokens to service_role;
grant all on table public.career_kit_sessions to service_role;
grant all on table public.career_kit_workbooks to service_role;
