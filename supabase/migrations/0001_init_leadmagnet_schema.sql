-- =========================================================================
-- Mapa de Automação Bluemetrics — schema inicial (PRD seção 17)
-- Aplicado no projeto Supabase "leadmagnet" (mkmvgdgtcjbnarnhcyxr).
--
-- MVP determinístico. Tabelas privadas: RLS habilitada SEM policies e SEM
-- grants para anon/authenticated => acesso exclusivo pelo backend
-- (service_role bypassa RLS). Admin usa Supabase Auth + autorização no servidor.
-- =========================================================================

-- Tipos --------------------------------------------------------------------
create type diagnostic_status as enum ('preliminary', 'confirmed');

create type company_lookup_status as enum (
  'idle', 'validating', 'loading', 'found', 'partial',
  'not_found', 'provider_unavailable', 'rate_limited', 'budget_exceeded', 'manual'
);

-- Função utilitária de updated_at (search_path fixado por segurança) --------
create or replace function set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 1. Sessão do visitante ---------------------------------------------------
create table visitor_sessions (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,              -- só o hash do token; nunca o token
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index idx_visitor_sessions_expires on visitor_sessions (expires_at);

-- 2. Cache de enriquecimento (só dados do provedor; sem respostas do usuário)
create table company_lookup_cache (
  domain text primary key,
  status company_lookup_status not null,
  name text,
  industry text,
  employee_range text,
  location text,
  simulated boolean not null default false,     -- dados simulados nunca são "reais"
  fetched_at timestamptz not null default now(),
  expires_at timestamptz not null               -- TTL positivo/negativo controlado pelo backend
);
create index idx_company_cache_expires on company_lookup_cache (expires_at);

-- 3. Uso/custo das consultas (contadores por dia e sessão) -----------------
create table company_lookup_usage (
  id uuid primary key default gen_random_uuid(),
  usage_day date not null default (now() at time zone 'utc')::date,
  session_id uuid references visitor_sessions (id) on delete set null,
  domain text,
  result company_lookup_status,
  estimated_cost numeric(10,4) not null default 0,
  created_at timestamptz not null default now()
);
create index idx_company_usage_day on company_lookup_usage (usage_day);
create index idx_company_usage_session on company_lookup_usage (session_id);

-- 4. Diagnóstico (agregado principal) --------------------------------------
create table diagnostics (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references visitor_sessions (id) on delete cascade,
  status diagnostic_status not null default 'preliminary',
  process_name text,
  rules_version text not null,
  templates_version text not null,
  version integer not null default 0,           -- controle de conflito (expectedVersion)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_diagnostics_session on diagnostics (session_id);
create index idx_diagnostics_status on diagnostics (status);
create index idx_diagnostics_updated on diagnostics (updated_at desc);
create trigger trg_diagnostics_updated before update on diagnostics
  for each row execute function set_updated_at();

-- 5. Contexto empresarial do diagnóstico (proveniência separada) -----------
--    apollo_snapshot: snapshot REDUZIDO do provedor (sem payload completo).
--    corrections: correções do usuário. confirmed: contexto confirmado.
--    O snapshot confirmado NÃO muda quando o cache é atualizado.
create table diagnostic_company_context (
  diagnostic_id uuid primary key references diagnostics (id) on delete cascade,
  apollo_snapshot jsonb,
  corrections jsonb,
  confirmed jsonb,
  context_confirmed boolean not null default false,
  updated_at timestamptz not null default now()
);
create trigger trg_diag_company_updated before update on diagnostic_company_context
  for each row execute function set_updated_at();

-- 6. Versões do diagnóstico (processo atual + proposta + versão de regras) --
create table diagnostic_versions (
  id uuid primary key default gen_random_uuid(),
  diagnostic_id uuid not null references diagnostics (id) on delete cascade,
  version integer not null,
  current_process jsonb not null,               -- grafo do processo atual
  proposal jsonb,                               -- camada derivada (proposta)
  rules_version text not null,
  templates_version text not null,
  created_at timestamptz not null default now(),
  unique (diagnostic_id, version)
);
create index idx_diag_versions_diagnostic on diagnostic_versions (diagnostic_id);

-- 7. Leads (contato declarado; e-mail normalizado único) -------------------
--    E-mail digitado não é identidade verificada e não concede acesso a diagnósticos.
create table leads (
  id uuid primary key default gen_random_uuid(),
  email_normalized text not null unique,
  name text,
  role text,
  company text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_leads_updated before update on leads
  for each row execute function set_updated_at();

-- 8. Associação lead <-> diagnóstico (vários diagnósticos por lead) --------
create table lead_diagnostics (
  lead_id uuid not null references leads (id) on delete cascade,
  diagnostic_id uuid not null references diagnostics (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (lead_id, diagnostic_id)
);
create index idx_lead_diagnostics_diagnostic on lead_diagnostics (diagnostic_id);

-- 9. Solicitações de avaliação (explícitas; idempotência) ------------------
create table contact_requests (
  id uuid primary key default gen_random_uuid(),
  diagnostic_id uuid not null references diagnostics (id) on delete cascade,
  scope text,
  has_process_owner boolean not null default false,
  timeline text,
  budget_in_discussion text,
  idempotency_key text unique,                  -- evita duplo envio
  created_at timestamptz not null default now()
);
create index idx_contact_requests_diagnostic on contact_requests (diagnostic_id);

-- 10. Permissões (finalidade, escolha e versão do aviso) -------------------
create table permissions (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads (id) on delete cascade,
  diagnostic_id uuid references diagnostics (id) on delete cascade,
  purpose text not null,
  choice boolean not null,
  notice_version text not null,
  created_at timestamptz not null default now()
);
create index idx_permissions_lead on permissions (lead_id);

-- 11. Atribuição de campanha ----------------------------------------------
create table campaign_attributions (
  id uuid primary key default gen_random_uuid(),
  diagnostic_id uuid references diagnostics (id) on delete cascade,
  session_id uuid references visitor_sessions (id) on delete set null,
  source text,
  campaign text,
  medium text,
  created_at timestamptz not null default now()
);
create index idx_campaign_attr_diagnostic on campaign_attributions (diagnostic_id);

-- 12. Eventos de produto (sem texto livre nem dados pessoais) --------------
create table product_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references visitor_sessions (id) on delete set null,
  event text not null,
  meta jsonb,                                   -- apenas rótulos categóricos/contadores
  created_at timestamptz not null default now()
);
create index idx_product_events_event on product_events (event);
create index idx_product_events_created on product_events (created_at desc);
create index idx_product_events_session on product_events (session_id);

-- =========================================================================
-- Acesso: privado por padrão. RLS ligada em tudo, sem policies, e grants
-- removidos de anon/authenticated. Só o backend (service_role) acessa.
-- Os avisos "RLS enabled no policy" do linter são o comportamento desejado.
-- =========================================================================
do $$
declare t text;
begin
  foreach t in array array[
    'visitor_sessions','company_lookup_cache','company_lookup_usage',
    'diagnostics','diagnostic_company_context','diagnostic_versions',
    'leads','lead_diagnostics','contact_requests','permissions',
    'campaign_attributions','product_events'
  ]
  loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('revoke all on public.%I from anon, authenticated;', t);
    execute format('grant all on public.%I to service_role;', t);
  end loop;
end $$;
