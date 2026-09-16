# Regras do motor determinístico

Versão de regras: **1.0.0** (`RULES_VERSION` em `src/lib/domain/schemas.ts`).
Implementação: `src/lib/engine/rules.ts`. Textos: `src/config/recommendation-copy.ts`.
Cobertura: `tests/unit/engine.test.ts`.

## Precedência (seção 11)

1. Controles humanos prevalecem.
2. Cálculos objetivos permanecem determinísticos.
3. Acesso desconhecido permanece dependência.
4. Falta de informação impede conclusões categóricas.
5. Uma atividade pode combinar IA, regras e integração.

## Tabela de regras

| ID | Condição | Resultado | Tecnologia candidata |
| -- | -------- | --------- | -------------------- |
| R01 | Aprovação obrigatória ou atividade de aprovação | Preservar controle humano | `human_control` |
| R02 | Validar/calcular + critérios objetivos + sem interpretação | Sugerir regras ou cálculo | `rules_or_calculation` |
| R03 | Transferir/registrar + repetição | Automação de registro/integração | `integration` |
| R04 | Integração + acesso desconhecido | Registrar dependência | (modifica R03) |
| R05 | Extrair/interpretar + interpretação necessária | Assistência por IA | `ai_assist` |
| R06 | Encaminhar + critérios objetivos | Roteamento por regras | `rules_or_calculation` |
| R07 | Encaminhar + interpretação necessária | Classificação assistida | `assisted_classification` |
| R08 | Inconsistência + critérios não definidos | Definir critérios | `define_criteria` |
| R09 | Impacto de erro alto ou desconhecido | Revisão humana na proposta | `human_control` |
| R10 | Informação essencial desconhecida | Avaliação incompleta | `discovery` |
| R11 | Atividade "outro" sem classificação | Não recomendar tecnologia | `none` |
| R12 | Processo não confirmado | Resultado preliminar | — |

## Prontidão (readiness)

- `ready_for_evaluation` — recomendação substantiva sem dependências. Não significa
  pronto para produção.
- `has_dependencies` — depende de acesso/integração não confirmados, ou o processo
  ainda não foi confirmado (R12 adiciona a dependência "processo não confirmado" a
  todas as recomendações, rebaixando-as).
- `needs_info` — falta informação essencial (R10) ou classificação (R11).

## Explicação obrigatória (seção 11)

Cada recomendação carrega: atividade relacionada, mudança proposta (texto
parametrizado versionado), regra e versão, respostas que a sustentam, dependências,
controle humano, métrica de avaliação e estado de preparação.

## Priorização e recorte (seção 12)

`src/lib/engine/priorities.ts`. Ordena candidatos por:
1. Relação com a dor principal.
2. Ausência de bloqueios.
3. Informações essenciais disponíveis (oportunidade pronta).
4. Menor quantidade de sistemas.
5. Ordem original (desempate).

Sem base suficiente → recorte de descoberta com perguntas objetivas.

## Simulação (seção 14)

`src/lib/engine/simulation.ts`. O usuário informa o cenário proposto; o motor não
estima ganho. Fórmulas:

```
horas_atuais    = casos × min_atuais   / 60
horas_propostas = casos × min_propostos / 60
capacidade_liberada = horas_atuais − horas_propostas
valor_equivalente   = capacidade_liberada × custo_hora   (se custo informado)
```

Desconhecido nunca vira zero; resultado negativo é mostrado como aumento de esforço.
Caso de teste: 1.000 casos, 12→8 min ≈ 66,67 h/mês (coberto por teste).
