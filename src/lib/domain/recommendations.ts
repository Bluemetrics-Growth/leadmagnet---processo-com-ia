/* =========================================================================
   Tipos de saída do motor determinístico (não persistidos no diagnóstico;
   sempre recalculados a partir do processo confirmado + versão de regras).
   ========================================================================= */

/** Estado de preparação de uma oportunidade (seção 12). */
export type ReadinessState = "needs_info" | "has_dependencies" | "ready_for_evaluation";

/** Tecnologia candidata sugerida por uma regra. */
export type CandidateTech =
  | "human_control"
  | "rules_or_calculation"
  | "integration"
  | "ai_assist"
  | "assisted_classification"
  | "define_criteria"
  | "discovery"
  | "none";

export interface Recommendation {
  id: string;
  activityId: string;
  activityLabel: string;
  ruleId: string;
  rulesVersion: string;
  /** Mudança proposta, em texto parametrizado do catálogo. */
  proposedChange: string;
  candidateTech: CandidateTech;
  /** Respostas do usuário que sustentam a recomendação. */
  supportingAnswers: string[];
  dependencies: string[];
  /** Controle humano preservado, quando aplicável. */
  humanControl: string | null;
  /** Métrica sugerida para avaliação. */
  metric: string;
  readiness: ReadinessState;
}

/** Item da proposta (camada derivada, comparação atual/proposto — seção 13). */
export interface ProposedActivityLayer {
  activityId: string;
  activityLabel: string;
  currentExecution: string;
  proposedChange: string | null;
  candidateTech: CandidateTech;
  humanResponsibility: string | null;
  dependencies: string[];
}

/** Resultado completo da avaliação determinística. */
export interface EvaluationResult {
  diagnosticId: string;
  status: "preliminary" | "confirmed";
  rulesVersion: string;
  recommendations: Recommendation[];
  proposedLayer: ProposedActivityLayer[];
  /** Dependências pendentes agregadas. */
  pendingDependencies: string[];
  /** Marcado quando faltam informações essenciais (R10). */
  incomplete: boolean;
  /** Contadores para o cabeçalho do resultado. */
  summary: {
    activities: number;
    opportunities: number;
    readyForEvaluation: number;
    needsInfo: number;
    hasDependencies: number;
  };
}

/** Recorte priorizado sugerido (seção 12). */
export interface SuggestedScope {
  activityIds: string[];
  isDiscovery: boolean;
  reason: string;
}

/** Saída do cálculo de simulação (seção 14). */
export interface SimulationResult {
  hasEnoughInput: boolean;
  currentHours: number | null;
  proposedHours: number | null;
  freedCapacityHours: number | null;
  equivalentValue: number | null;
  /** true quando o esforço proposto é maior que o atual. */
  increasesEffort: boolean;
  notes: string[];
}
