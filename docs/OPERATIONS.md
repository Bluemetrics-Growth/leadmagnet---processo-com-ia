# Operação — Mapa de Automação Bluemetrics

## Requisitos

- Node.js 20+ (desenvolvido em Node 22).
- npm (lockfile versionado).

## Instalação

```bash
npm install
cp .env.example .env.local   # preencha conforme o ambiente
```

## Scripts

| Comando | Efeito |
| ------- | ------ |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run start` | Servir o build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Testes de unidade (Vitest) |
| `npm run test:e2e` | Testes e2e (Playwright) |

Em ambientes com Chromium pré-instalado (sem `playwright install`), aponte o
binário: `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium npm run test:e2e`.

## Apollo (contexto empresarial)

- Sem `APOLLO_API_KEY` em desenvolvimento, o **adaptador simulado** é usado
  automaticamente. Dados simulados sempre trazem `simulated: true` e são exibidos
  com aviso — nunca apresentados como dados reais de uma empresa (seção 19).
- Em produção **sem** credencial, a jornada segue por preenchimento manual.
- A consulta ocorre **somente após ação explícita** na capa; nunca a cada visita.
- Limites aplicados **antes** de acessar o provedor: por sessão
  (`APOLLO_LOOKUPS_PER_SESSION`) e diário (`APOLLO_DAILY_LOOKUP_LIMIT`), com
  timeout (`APOLLO_TIMEOUT_MS`) e cache positivo/negativo.
- Falha de credencial (401/403) não é cacheada como "empresa não encontrada".
- O servidor chama apenas o endpoint fixo de enriquecimento; **nunca** busca a URL
  informada pelo usuário.

## Variáveis de ambiente

Ver `.env.example`. Segredos apenas no servidor. Flags lidas no cliente usam
prefixo `NEXT_PUBLIC_` (`NEXT_PUBLIC_BOOKING_URL`, `NEXT_PUBLIC_ENABLE_LLM_ASSIST`).

Nota: `.env.example` documenta nomes conceituais do PRD; os nomes efetivos lidos no
cliente para agenda/LLM usam o prefixo `NEXT_PUBLIC_`. Ajuste conforme o deploy.

## Persistência

- MVP: os diagnósticos, leads e solicitações ficam no `localStorage` do navegador.
  Recuperação entre dispositivos por e-mail **não** é suportada. Exportação/importação
  JSON permite mover um diagnóstico entre navegadores.
- Produção: substituir `lib/persistence` e o cache de enriquecimento por Supabase,
  aplicando RLS nas tabelas expostas e verificação de propriedade no backend.

## Área interna

`/admin` — visão local (MVP). Em produção, autorização definida no servidor via
Supabase Auth. Sem ações de prospecção no Apollo.

## Testes críticos

- `tests/unit/engine.test.ts` — regras R01–R12, prontidão, determinismo, recorte.
- `tests/unit/simulation.test.ts` — fórmulas e o caso do PRD (66,67 h).
- `tests/unit/normalize-domain.test.ts` — normalização/validação de domínio.
- `tests/e2e/journey.spec.ts` — jornada da capa ao resultado (manual → recomendações).

## Não fazer no deploy local

Não publicar a aplicação nem executar ações comerciais externas (Apollo people,
sequências, mensagens) como parte da implementação. Estão fora do MVP (seção 6).
