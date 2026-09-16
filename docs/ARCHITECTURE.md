# Arquitetura — Mapa de Automação Bluemetrics

MVP determinístico, sem LLM. Next.js (App Router) + TypeScript. O motor de
recomendações é composto por funções puras, independentes de banco e interface.

## Camadas

| Camada | Escolha | Pasta |
| ------ | ------- | ----- |
| Aplicação | Next.js 15 + React 19 + TypeScript | `src/app` |
| Interface | Design system e componentes da BM | `src/components`, `public/brand` |
| Quadro principal | Componentes React (sem drag/canvas) | `components/process-board` |
| Fluxograma secundário | SVG somente leitura | `components/process-graph` |
| Validação | Zod | `lib/domain/schemas.ts` |
| Motor | Funções puras (regras R01–R12) | `lib/engine` |
| Contexto empresarial | Apollo Organization Enrichment (adaptador) | `lib/company-enrichment` |
| Persistência (MVP) | Navegador (localStorage) | `lib/persistence` |
| Persistência (produção) | Supabase Postgres + Auth | (documentado, não acoplado) |
| Testes | Vitest (unidade) + Playwright (e2e) | `tests` |
| LLM | Nenhuma | — |

## Fluxo de dados

1. **Capa (T0)** → `POST /api/company-lookup` (servidor) valida o domínio,
   verifica limites e chama o adaptador Apollo (ou simulado). O segredo nunca
   sai do servidor.
2. O cliente cria um `Diagnostic` (`lib/domain/factory.ts`) e o persiste no
   navegador (`lib/persistence/store.ts`).
3. **Wizard (T1–T4)** edita o diagnóstico. Proveniência de contexto empresarial
   (Apollo / usuário / confirmado) é mantida separada.
4. **Resultado (T5)** roda `evaluateWithScope(diagnostic)` (motor puro) para gerar
   recomendações, comparação atual/proposto e recorte sugerido. Nada é persistido
   do resultado: sempre recalculado a partir do processo confirmado + versão de regras.
5. **Captura/Exportação (T6)** e **Solicitação (T7)** gravam lead e pedido locais.

## Separação de fontes (seção 13)

O modelo mantém distintos, sem mistura automática:
- Sugestão do modelo (`origin: "template"`).
- Informação do usuário (`origin: "user"`, respostas estruturadas).
- Informação empresarial do Apollo (`company.apolloSnapshot`, proveniência `apollo`).
- Recomendação do motor (camada derivada, recalculada).
- Informação desconhecida (`unknown`, marcada como dependência/pendência).

O contexto empresarial (setor/porte) **não** preenche atributos operacionais nem
altera as regras técnicas no MVP.

## Determinismo

`lib/engine/*` não importa banco, rede nem React. Mesmas entradas + mesma versão
de regras produzem o mesmo `EvaluationResult` (coberto por teste).

## Endpoints

Ver seção 18 do PRD. Implementados no MVP: `POST /api/company-lookup`,
`POST /api/import`. Os demais (diagnostics, capture, contact-request, events)
operam no cliente no MVP e têm contrato preparado para migração ao Supabase
(`expectedVersion` para conflito, idempotência em captura/solicitação).

## Caminho para produção (Supabase)

As interfaces de `lib/persistence` e `lib/company-enrichment/cache` isolam o
armazenamento. A troca por Supabase substitui essas implementações sem alterar o
domínio nem o motor:
- `visitor_sessions`, `diagnostics`, `diagnostic_company_context`,
  `diagnostic_versions`, `leads`, `contact_requests`, `company_lookup_cache`,
  `company_lookup_usage`, `product_events` (seção 17).
- Tabelas expostas pela Data API exigem RLS; acesso privilegiado do backend exige
  verificação explícita de propriedade da sessão.

## React Flow

O PRD sugere React Flow para o fluxograma. Optou-se por um renderizador SVG próprio
(`ProcessGraphView`) para garantir a regra da seção 4.5 (não depender de arrastar
nem navegar um canvas) e reduzir peso. React Flow permanece como evolução opcional
para edição visual avançada, sem impacto no domínio.
