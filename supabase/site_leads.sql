-- Contatos e Leads do Site · Supabase Schema (idempotente)
-- Armazena todos os formulários do site (Serviços, Materiais e Fale comigo).
--
-- Privacidade e segurança:
--   RLS ativada sem políticas para anon/authenticated; todo acesso acontece no servidor
--   via Secret / Service Role Key.

create table if not exists public.site_leads (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('service', 'material', 'contact')),
  name text not null,
  email text not null,
  company text not null default '',
  team_size text not null default '',
  message text not null default '',
  service text not null,
  format text not null default '',
  page text not null default '',
  audience text not null default '',
  opt_in boolean not null default false,
  status text not null default 'new' check (status in ('new', 'replied', 'archived')),
  notes text not null default '',
  source text not null default 'web' check (source in ('web', 'import')),
  external_id text null unique,
  created_at timestamptz not null default now()
);

create index if not exists idx_site_leads_status_created
  on public.site_leads (status, created_at desc, id desc);

create index if not exists idx_site_leads_kind_created
  on public.site_leads (kind, created_at desc, id desc);

alter table public.site_leads enable row level security;

revoke all on table public.site_leads from public, anon, authenticated;
grant all on table public.site_leads to service_role;
