# Mapa do Design System — Bluemetrics

Fonte de verdade da marca para este projeto. Registra os arquivos oficiais
inventariados, onde vivem no repositório e como são usados. Segue as regras da
seção 4 do PRD (design system oficial tem precedência sobre qualquer improviso).

## 1. Origem dos arquivos

O pacote oficial foi entregue como `Copy of BlueMetrics Site Design System (official) (1).zip`
na raiz do repositório. Seu conteúdo foi extraído e integrado em `public/brand/`
(servido estaticamente) e a documentação de marca em `docs/`.

## 2. Inventário

| Item | Arquivo oficial | Uso neste projeto |
| ---- | --------------- | ----------------- |
| Manual de marca | `docs/bluemetrics_brand-guidelines.pdf` | Fonte de verdade de logo/cor/tipo |
| Tokens (cor, tipo, espaço, raio, sombra, motion) | `public/brand/colors_and_type.css` | Carregado via `<link>` no `layout.tsx`; base de toda a UI |
| Entry point CSS | `public/brand/styles.css` | `@import` do arquivo de tokens (referência) |
| Tipografia display | `public/brand/fonts/Outfit-*.ttf` (100–900) | `--font-display` (títulos) |
| Tipografia corpo | `public/brand/fonts/Wix_Madefor_Text-*.ttf` | `--font-body` (17px padrão) |
| Logotipos (12 lockups) | `public/brand/assets/logo-*.png` | `components/brand/Nav.tsx` (horizontal azul); nunca recriado em CSS |
| Imagery de marca | `public/brand/assets/bg-*.jpg/png` | Disponível para fundos abstratos (metaballs deep-blue) |
| Especímenes | (referência) `preview/*.html` no pacote | Base para botões, cartões, inputs, nav, badges |
| UI kit | (referência) `ui_kits/website/` no pacote | Referência de uso ponta a ponta |

## 3. Tokens efetivamente usados

Definidos em `public/brand/colors_and_type.css`, consumidos por `src/app/globals.css`
e componentes. Nenhum token provisório do PRD anterior foi introduzido; nenhuma
paleta foi inventada.

- **Cor primária**: `--bm-blue` `#0c27e8` (acento único), `--bm-deep-blue` `#030a8b`.
- **Suporte** (`--bm-mint/cyan/green/yellow/purple/magenta/orange`): usados apenas em
  status, chips e rótulos de tecnologia (IA/regra/integração), nunca como preenchimento de layout.
- **Neutros** (`--neutral-0..900`): superfícies, texto e bordas (escala Apple-like).
- **Semânticos**: `--bg`, `--bg-stage`, `--fg-1/2/3`, `--link`, `--border`, `--accent-soft`,
  `--success`, `--info`, `--warning`, `--danger`.
- **Tipo**: `--font-display` (Outfit), `--font-body` (Wix Madefor Text), rampa `--fs-*`,
  altura de linha `--lh-*`, tracking `--ls-*`.
- **Espaço/raio/sombra**: escala `--space-1..10`, `--radius-xs..pill`, `--shadow-1..3`, `--shadow-blue`.
- **Motion**: `--ease-*`, `--dur-1..4`.

## 4. Componentes (extensões documentadas)

Construídos em `src/app/globals.css` e `src/components/`, sempre a partir dos tokens.
Onde a marca não especifica um componente, a extensão está documentada abaixo.

| Componente | Base oficial | Observação |
| ---------- | ------------ | ---------- |
| Botões (`.btn-*`) | `preview/buttons.html` | Pílula (`--radius-pill`), primário/secundário/terciário/ghost |
| Cartões (`.card`, `.card-stage`, `.card-selectable`) | `preview/cards.html` | Seleção por cartão (ref. Pega) adiciona estado `card-selected` |
| Campos (`.field`) | `preview/form-inputs.html` | Foco azul com halo `--accent-soft` |
| Chips/badges (`.chip-*`) | `preview/badges.html` | Reaproveitados como rótulos de tecnologia e prontidão |
| Nav (`.bm-nav`) | `preview/nav-bar.html` | Cabeçalho compacto translúcido |
| **Quadro de fases** | — (novo) | Extensão: colunas de fase com cartões de atividade (ref. Pega, visual BM) |
| **Fluxograma** | — (novo) | Extensão: SVG somente leitura, sem drag/canvas (seção 4.5) |
| **Barra de progresso** | — (novo) | Extensão: progresso do wizard com tokens de cor |

## 5. Conflitos

Nenhum conflito entre fontes oficiais foi identificado durante a integração. Caso
surja, a ordem de precedência da seção 4.2 é seguida e o conflito é sinalizado aqui
antes de qualquer interpretação silenciosa.

## 6. Acessibilidade e responsividade

- Navegação principal (quadro de fases) funciona no celular (colunas roláveis / empilhamento)
  e por teclado (cartões e controles são elementos focáveis nativos).
- A interface não depende de arrastar elementos nem de navegar um canvas (seção 4.5).
- Contraste segue os neutros e o azul da marca sobre superfícies claras.
