# Supabase — Mapa de Automação Bluemetrics

Projeto: **leadmagnet** (`mkmvgdgtcjbnarnhcyxr`), região São Paulo (`sa-east-1`).
URL da API: `https://mkmvgdgtcjbnarnhcyxr.supabase.co`

## Schema

O schema segue a seção 17 do PRD e vive em `migrations/0001_init_leadmagnet_schema.sql`.
Ele já foi aplicado ao projeto remoto via MCP (migrations `init_leadmagnet_schema`
e `harden_set_updated_at_search_path`). O arquivo `0001` é a versão canônica
consolidada (com o `search_path` da função já fixado), pronto para rodar de uma vez
num banco novo.

### Tabelas (todas privadas — só o backend acessa)

| Tabela | Finalidade |
| ------ | ---------- |
| `visitor_sessions` | Sessão do visitante (hash do token, validade) |
| `company_lookup_cache` | Snapshot reduzido do provedor por domínio, status e TTL |
| `company_lookup_usage` | Contadores de consulta por dia/sessão e custo estimado |
| `diagnostics` | Diagnóstico (sessão, status, versão, versões de regras/modelos) |
| `diagnostic_company_context` | Snapshot Apollo, correções e contexto confirmado |
| `diagnostic_versions` | Processo atual + proposta + versão de regras por versão |
| `leads` | Contato declarado (e-mail normalizado único) |
| `lead_diagnostics` | Associação lead ↔ diagnóstico (N:N) |
| `contact_requests` | Solicitações explícitas de avaliação (idempotência) |
| `permissions` | Finalidade, escolha e versão do aviso |
| `campaign_attributions` | Origem e campanha |
| `product_events` | Eventos sem texto livre ou dado pessoal |

## Modelo de acesso

- **RLS habilitada em todas as tabelas, sem policies**, e grants removidos de
  `anon`/`authenticated`. Resultado: as tabelas não são acessíveis pela Data API
  pública. Só o backend, usando a **service role key** (que faz bypass de RLS),
  lê e escreve. Isso implementa "tabelas privadas para acesso exclusivo pelo
  backend" (PRD seção 16).
- Os avisos `rls_enabled_no_policy` (INFO) do linter são **esperados** — refletem
  exatamente essa decisão de projeto.
- O acesso privilegiado do backend deve verificar a propriedade da sessão
  explicitamente em cada operação (comparar `diagnostics.session_id` com a sessão
  do cookie), já que a service role ignora RLS.
- A área administrativa deve usar Supabase Auth + autorização no servidor.

## Variáveis de ambiente (servidor)

```
SUPABASE_URL=https://mkmvgdgtcjbnarnhcyxr.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<Dashboard > Settings > API > service_role (SECRETO)>
```

Configure ambas no Vercel (Project > Settings > Environment Variables) e em
`.env.local` para desenvolvimento. A service role key nunca vai ao cliente nem
ao repositório.

## Aplicar em outro ambiente

- **SQL Editor**: cole o conteúdo de `migrations/0001_init_leadmagnet_schema.sql`
  e execute.
- **Supabase CLI**: `supabase link --project-ref mkmvgdgtcjbnarnhcyxr` e
  `supabase db push`.

## Estado atual da aplicação

O app em produção ainda persiste o diagnóstico no navegador (MVP offline-first).
A troca da persistência para estas tabelas (endpoints de sessão, diagnóstico,
captura, solicitação e eventos usando a service role) é a Etapa 4 do PRD e o
próximo passo de integração.
