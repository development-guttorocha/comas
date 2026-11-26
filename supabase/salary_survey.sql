-- Pesquisa Salarial Anônima · Supabase Schema (idempotente)
-- Cole e execute este script no SQL Editor do seu projeto Supabase.
--
-- Privacidade garantida no banco:
--   1. As respostas e os e-mails ficam em tabelas totalmente separadas (sem chave estrangeira).
--   2. Apenas a data (YYYY-MM-DD, sem hora) é gravada.
--   3. RLS ativada sem políticas para anon/authenticated; todo acesso vem do servidor via Secret / Service Role Key.

create table if not exists public.salary_survey_responses (
  id uuid primary key default gen_random_uuid(),
  edition text not null default '2027',
  role text not null,
  role_band_id text null,
  specialty text not null,
  experience text not null,
  regime text not null,
  salary integer not null check (salary >= 500 and salary <= 500000),
  bonus text not null,
  company_size text not null,
  sector text not null,
  state text not null,
  work_model text not null,
  gender text not null default '',
  submitted_date date not null default current_date,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  outlier_flag boolean not null default false,
  source text not null default 'web' check (source in ('web', 'import')),
  reviewed_date date null
);

create index if not exists idx_salary_survey_responses_admin_list
  on public.salary_survey_responses (edition, status, submitted_date desc, id desc);

create index if not exists idx_salary_survey_responses_approved_bands
  on public.salary_survey_responses (edition, role_band_id)
  where status = 'approved' and role_band_id is not null and regime in ('CLT', 'PJ');

create table if not exists public.salary_survey_emails (
  id uuid primary key default gen_random_uuid(),
  edition text not null default '2027',
  email text not null,
  submitted_date date not null default current_date,
  unique (edition, email)
);

-- Segurança: fecha acesso público (anon/authenticated) e restringe ao servidor (service_role).
alter table public.salary_survey_responses enable row level security;
alter table public.salary_survey_emails enable row level security;

revoke all on table public.salary_survey_responses from public, anon, authenticated;
revoke all on table public.salary_survey_emails from public, anon, authenticated;

grant all on table public.salary_survey_responses to service_role;
grant all on table public.salary_survey_emails to service_role;

-- Agregação no Postgres: normaliza respostas CLT/PJ aprovadas para a base (CLT, 501 a 5.000 pessoas)
-- e retorna P25, P50 e P75 por papel, mais a linha resumo '__all__' com o total de aprovadas.
create or replace function public.get_salary_band_stats(p_edition text default '2027')
returns table (
  role_band_id text,
  sample_count integer,
  p25 numeric,
  p50 numeric,
  p75 numeric
)
language sql
stable
security invoker
set search_path = ''
as $$
  with normalized as (
    select
      r.role_band_id,
      r.salary::numeric / (
        (case r.company_size
          when 'Até 50 pessoas' then 0.85
          when '51 a 500' then 0.95
          when '501 a 5.000' then 1.0
          when 'Mais de 5.000' then 1.1
          else 1.0
        end)
        * (case when r.regime = 'PJ' then 1.5 else 1.0 end)
      ) as base_salary
    from public.salary_survey_responses r
    where r.edition = p_edition
      and r.status = 'approved'
      and r.role_band_id is not null
      and r.regime in ('CLT', 'PJ')
  )
  select
    n.role_band_id,
    count(*)::integer as sample_count,
    round(percentile_cont(0.25) within group (order by n.base_salary))::numeric as p25,
    round(percentile_cont(0.50) within group (order by n.base_salary))::numeric as p50,
    round(percentile_cont(0.75) within group (order by n.base_salary))::numeric as p75
  from normalized n
  group by n.role_band_id

  union all

  select
    '__all__'::text as role_band_id,
    count(*)::integer as sample_count,
    null::numeric as p25,
    null::numeric as p50,
    null::numeric as p75
  from public.salary_survey_responses r
  where r.edition = p_edition
    and r.status = 'approved';
$$;

revoke all on function public.get_salary_band_stats(text) from public, anon, authenticated;
grant execute on function public.get_salary_band_stats(text) to service_role;

-- Agregação pública anônima para /recursos/pesquisa-salarial (#resultados).
-- Retorna apenas grupos com ao menos p_min_group respostas (piso rígido de 5 no SQL)
-- para garantir que nenhuma pessoa possa ser identificada.
create or replace function public.get_salary_survey_results(
  p_edition text default '2027',
  p_min_group integer default 5
)
returns table (
  cut text,
  group_key text,
  sample_count integer,
  p25 numeric,
  p50 numeric,
  p75 numeric
)
language sql
stable
security invoker
set search_path = ''
as $$
  with cfg as (
    select greatest(coalesce(p_min_group, 5), 5) as min_group
  ),
  base as (
    select
      r.role,
      r.regime,
      r.salary,
      r.company_size,
      r.sector,
      r.state,
      r.gender,
      case
        when r.state in ('SP', 'RJ', 'MG', 'ES') then 'Sudeste'
        when r.state in ('PR', 'SC', 'RS') then 'Sul'
        when r.state in ('BA', 'PE', 'CE', 'RN', 'PB', 'AL', 'SE', 'MA', 'PI') then 'Nordeste'
        when r.state in ('DF', 'GO', 'MT', 'MS') then 'Centro-Oeste'
        when r.state in ('AM', 'PA', 'RO', 'RR', 'AC', 'AP', 'TO') then 'Norte'
        when r.state = 'Fora do Brasil' then 'Fora do Brasil'
        else null
      end as region
    from public.salary_survey_responses r
    where r.edition = p_edition
      and r.status = 'approved'
  )
  select
    'summary'::text as cut,
    '__all__'::text as group_key,
    count(*)::integer as sample_count,
    case when count(*) >= (select min_group from cfg)
      then round(percentile_cont(0.25) within group (order by b.salary))::numeric
      else null::numeric
    end as p25,
    case when count(*) >= (select min_group from cfg)
      then round(percentile_cont(0.50) within group (order by b.salary))::numeric
      else null::numeric
    end as p50,
    case when count(*) >= (select min_group from cfg)
      then round(percentile_cont(0.75) within group (order by b.salary))::numeric
      else null::numeric
    end as p75
  from base b

  union all

  select
    'role'::text as cut,
    b.role as group_key,
    count(*)::integer as sample_count,
    round(percentile_cont(0.25) within group (order by b.salary))::numeric as p25,
    round(percentile_cont(0.50) within group (order by b.salary))::numeric as p50,
    round(percentile_cont(0.75) within group (order by b.salary))::numeric as p75
  from base b
  where b.role <> ''
  group by b.role
  having count(*) >= (select min_group from cfg)

  union all

  select
    'regime'::text as cut,
    b.regime as group_key,
    count(*)::integer as sample_count,
    round(percentile_cont(0.25) within group (order by b.salary))::numeric as p25,
    round(percentile_cont(0.50) within group (order by b.salary))::numeric as p50,
    round(percentile_cont(0.75) within group (order by b.salary))::numeric as p75
  from base b
  where b.regime <> ''
  group by b.regime
  having count(*) >= (select min_group from cfg)

  union all

  select
    'region'::text as cut,
    b.region as group_key,
    count(*)::integer as sample_count,
    round(percentile_cont(0.25) within group (order by b.salary))::numeric as p25,
    round(percentile_cont(0.50) within group (order by b.salary))::numeric as p50,
    round(percentile_cont(0.75) within group (order by b.salary))::numeric as p75
  from base b
  where b.region is not null
  group by b.region
  having count(*) >= (select min_group from cfg)

  union all

  select
    'state'::text as cut,
    b.state as group_key,
    count(*)::integer as sample_count,
    round(percentile_cont(0.25) within group (order by b.salary))::numeric as p25,
    round(percentile_cont(0.50) within group (order by b.salary))::numeric as p50,
    round(percentile_cont(0.75) within group (order by b.salary))::numeric as p75
  from base b
  where b.state <> '' and b.state <> 'Fora do Brasil'
  group by b.state
  having count(*) >= (select min_group from cfg)

  union all

  select
    'company_size'::text as cut,
    b.company_size as group_key,
    count(*)::integer as sample_count,
    round(percentile_cont(0.25) within group (order by b.salary))::numeric as p25,
    round(percentile_cont(0.50) within group (order by b.salary))::numeric as p50,
    round(percentile_cont(0.75) within group (order by b.salary))::numeric as p75
  from base b
  where b.company_size <> ''
  group by b.company_size
  having count(*) >= (select min_group from cfg)

  union all

  select
    'sector'::text as cut,
    b.sector as group_key,
    count(*)::integer as sample_count,
    round(percentile_cont(0.25) within group (order by b.salary))::numeric as p25,
    round(percentile_cont(0.50) within group (order by b.salary))::numeric as p50,
    round(percentile_cont(0.75) within group (order by b.salary))::numeric as p75
  from base b
  where b.sector <> ''
  group by b.sector
  having count(*) >= (select min_group from cfg)

  union all

  select
    'gender'::text as cut,
    b.gender as group_key,
    count(*)::integer as sample_count,
    round(percentile_cont(0.25) within group (order by b.salary))::numeric as p25,
    round(percentile_cont(0.50) within group (order by b.salary))::numeric as p50,
    round(percentile_cont(0.75) within group (order by b.salary))::numeric as p75
  from base b
  where b.gender in ('Mulher', 'Homem', 'Não binário')
  group by b.gender
  having count(*) >= (select min_group from cfg)

  union all

  select
    'gender_role'::text as cut,
    b.role || '::' || b.gender as group_key,
    count(*)::integer as sample_count,
    round(percentile_cont(0.25) within group (order by b.salary))::numeric as p25,
    round(percentile_cont(0.50) within group (order by b.salary))::numeric as p50,
    round(percentile_cont(0.75) within group (order by b.salary))::numeric as p75
  from base b
  where b.gender in ('Mulher', 'Homem', 'Não binário')
    and b.role <> ''
  group by b.role, b.gender
  having count(*) >= (select min_group from cfg);
$$;

revoke all on function public.get_salary_survey_results(text, integer) from public, anon, authenticated;
grant execute on function public.get_salary_survey_results(text, integer) to service_role;
