import { COPY_VERSION } from "@/lib/domain/schemas";
import type { CandidateTech } from "@/lib/domain/recommendations";

/* =========================================================================
   Catálogo de textos parametrizados (versionado).
   O motor referencia estas chaves; nenhum texto é gerado por LLM.
   ========================================================================= */

export const RECOMMENDATION_COPY_VERSION = COPY_VERSION;

export interface RuleCopy {
  proposedChange: string;
  metric: string;
  humanControl: string | null;
  candidateTech: CandidateTech;
}

/** Copy por regra. `{atividade}` é substituído pelo label da atividade. */
export const RULE_COPY: Record<string, RuleCopy> = {
  R01: {
    proposedChange:
      "Preservar a decisão humana em “{atividade}”. A automação prepara e organiza as informações, mas a aprovação continua com uma pessoa.",
    metric: "Tempo de preparação por caso antes da aprovação humana.",
    humanControl: "Aprovação humana obrigatória mantida.",
    candidateTech: "human_control",
  },
  R02: {
    proposedChange:
      "Aplicar regras ou cálculo determinístico em “{atividade}”, já que há critérios objetivos e não é necessário interpretar conteúdo.",
    metric: "Percentual de casos resolvidos por regra sem intervenção manual.",
    humanControl: null,
    candidateTech: "rules_or_calculation",
  },
  R03: {
    proposedChange:
      "Automatizar o registro ou a integração em “{atividade}”, eliminando a redigitação de uma etapa repetitiva de transferência ou registro.",
    metric: "Tempo médio de registro por caso e taxa de erros de digitação.",
    humanControl: null,
    candidateTech: "integration",
  },
  R04: {
    proposedChange:
      "A oportunidade em “{atividade}” depende de integração, mas o acesso aos dados ainda não está confirmado. Registrar como dependência a ser validada.",
    metric: "Confirmação de disponibilidade de API ou arquivo para os dados.",
    humanControl: null,
    candidateTech: "integration",
  },
  R05: {
    proposedChange:
      "Sugerir assistência por IA em “{atividade}” para apoiar a extração ou interpretação, com revisão humana das saídas.",
    metric: "Precisão da extração assistida validada por amostragem humana.",
    humanControl: "Revisão humana das saídas assistidas.",
    candidateTech: "ai_assist",
  },
  R06: {
    proposedChange:
      "Rotear “{atividade}” por regras, aproveitando os critérios objetivos já existentes para encaminhamento automático.",
    metric: "Percentual de encaminhamentos corretos por regra.",
    humanControl: null,
    candidateTech: "rules_or_calculation",
  },
  R07: {
    proposedChange:
      "Usar classificação assistida em “{atividade}”, apoiando o encaminhamento quando é necessário interpretar o conteúdo da solicitação.",
    metric: "Acurácia da classificação assistida contra decisão humana.",
    humanControl: "Revisão humana em casos de baixa confiança.",
    candidateTech: "assisted_classification",
  },
  R08: {
    proposedChange:
      "Definir critérios objetivos para “{atividade}” antes de automatizar, reduzindo a inconsistência observada.",
    metric: "Redução da variação de decisões após critérios definidos.",
    humanControl: null,
    candidateTech: "define_criteria",
  },
  R09: {
    proposedChange:
      "Incluir revisão humana na proposta para “{atividade}”, dado o impacto alto ou desconhecido de um erro.",
    metric: "Taxa de erros detectados na revisão humana.",
    humanControl: "Revisão humana obrigatória na proposta.",
    candidateTech: "human_control",
  },
  R10: {
    proposedChange:
      "Informações essenciais de “{atividade}” ainda são desconhecidas. A avaliação permanece incompleta até que sejam esclarecidas.",
    metric: "Preenchimento das características essenciais da atividade.",
    humanControl: null,
    candidateTech: "discovery",
  },
  R11: {
    proposedChange:
      "“{atividade}” está classificada como “outro” sem detalhamento suficiente. Não é possível recomendar tecnologia com segurança.",
    metric: "Classificação adequada do tipo da atividade.",
    humanControl: null,
    candidateTech: "none",
  },
  R12: {
    proposedChange:
      "O processo ainda não foi confirmado. As recomendações são apresentadas como preliminares.",
    metric: "Confirmação da estrutura do processo pelo usuário.",
    humanControl: null,
    candidateTech: "none",
  },
};

/** Rótulos legíveis para as respostas que sustentam recomendações. */
export const ANSWER_LABELS = {
  structuredInput: {
    yes: "Entrada estruturada",
    no: "Entrada não estruturada",
    unknown: "Estrutura da entrada desconhecida",
  },
  objectiveRules: {
    yes: "Possui critérios objetivos",
    no: "Sem critérios objetivos definidos",
    unknown: "Critérios não informados",
  },
  interpretationRequired: {
    yes: "Requer interpretação de texto, imagem ou conversa",
    no: "Não requer interpretação",
    unknown: "Necessidade de interpretação desconhecida",
  },
  repetitive: {
    yes: "Atividade repetitiva",
    no: "Atividade não repetitiva",
    unknown: "Repetição desconhecida",
  },
  mandatoryHumanApproval: {
    yes: "Aprovação humana obrigatória",
    no: "Sem aprovação humana obrigatória",
    unknown: "Aprovação humana não informada",
  },
} as const;

export const CANDIDATE_TECH_LABEL: Record<CandidateTech, string> = {
  human_control: "Controle humano",
  rules_or_calculation: "Regras / cálculo",
  integration: "Integração",
  ai_assist: "Assistência por IA",
  assisted_classification: "Classificação assistida",
  define_criteria: "Definição de critérios",
  discovery: "Descoberta",
  none: "Sem recomendação",
};
