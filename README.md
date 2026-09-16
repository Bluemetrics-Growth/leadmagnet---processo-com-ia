# Mapa de Automação Bluemetrics

Lead magnet de diagnóstico de processos. O gestor informa o site da empresa,
confirma o contexto empresarial, mapeia um processo e recebe oportunidades de
automação por regras explícitas — comparando processo atual e proposta, delimitando
um primeiro recorte e exportando o diagnóstico.

**MVP determinístico, sem LLM.** Next.js + TypeScript, design system oficial da
Bluemetrics, motor de regras versionado e testável.

## Início rápido

```bash
npm install
cp .env.example .env.local
npm run dev            # http://localhost:3000
```

Sem `APOLLO_API_KEY`, o adaptador de enriquecimento **simulado** é usado
automaticamente (dados marcados como simulados).

## Scripts

- `npm run dev` — desenvolvimento
- `npm run build` / `npm run start` — produção
- `npm run typecheck` — TypeScript
- `npm test` — unidade (Vitest)
- `npm run test:e2e` — e2e (Playwright)

## Estrutura

```
src/app            Rotas (capa, /mapa/[id], /api/*)
src/components      UI por área (landing, company-context, wizard, process-board,
                   process-graph, activity-editor, opportunities, simulation,
                   lead-capture, result, brand)
src/lib/domain     Schemas Zod, tipos, fábricas, operações de grafo, rótulos
src/lib/engine     Motor determinístico (regras R01–R12, recorte, simulação)
src/lib/company-enrichment  Normalização de domínio, adaptadores Apollo/simulado, cache
src/lib/persistence Persistência do MVP (navegador)
src/lib/exports    Markdown / JSON / impressão
src/lib/analytics  Eventos de produto
src/config         Modelos de processo, regras, textos, produto
public/brand       Design system oficial (tokens, fontes, logos, imagery)
docs               PRD, DESIGN_SYSTEM_MAP, ARCHITECTURE, RULES, OPERATIONS
tests              Unidade e e2e
```

## Documentação

- [`docs/PRD.md`](docs/PRD.md) — escopo e critérios de aceite
- [`docs/DESIGN_SYSTEM_MAP.md`](docs/DESIGN_SYSTEM_MAP.md) — marca e tokens
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — camadas e fluxo
- [`docs/RULES.md`](docs/RULES.md) — motor determinístico
- [`docs/OPERATIONS.md`](docs/OPERATIONS.md) — instalação, Apollo, testes

## Princípios

- Contexto empresarial (setor/porte) **não** infere processos, sistemas, volumes ou
  ganhos. Recomendações dependem das respostas operacionais confirmadas.
- Processo atual, sugestões do modelo, dados do Apollo e proposta ficam **separados**.
- Nenhum segredo no cliente; adaptadores simulados nunca aparecem como dados reais.
- Diagnóstico preliminar e explicável — sem promessa de viabilidade em produção.
