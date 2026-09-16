import type { ProcessContext, ProcessGraph, ProcessProblem } from "@/lib/domain/schemas";
import type { Recommendation, SuggestedScope } from "@/lib/domain/recommendations";

/* =========================================================================
   Priorização e recorte (seção 12). Função pura.
   Sugere até três atividades relacionadas; se não houver base, recomenda
   um recorte de descoberta.
   ========================================================================= */

const PROBLEM_TO_SIGNAL: Record<ProcessProblem, string | null> = {
  manual_work: "manual_work",
  waiting: "waiting",
  rework: "rework",
  inconsistency: "inconsistency",
  volume: "volume",
  traceability: "traceability",
  still_exploring: null,
};

interface Scored {
  activityId: string;
  order: number;
  relatedToPain: boolean;
  hasReadyOpportunity: boolean;
  hasSubstantive: boolean;
  blocked: boolean;
  systemsCount: number;
}

const SUBSTANTIVE = new Set(["rules_or_calculation", "integration", "ai_assist", "assisted_classification"]);

export function suggestScope(
  graph: ProcessGraph,
  recommendationsByActivity: Map<string, Recommendation[]>,
  context: ProcessContext | null,
): SuggestedScope {
  const mainSignal = context ? PROBLEM_TO_SIGNAL[context.mainProblem] : null;

  const scored: Scored[] = graph.activities.map((a) => {
    const recs = recommendationsByActivity.get(a.id) ?? [];
    const hasSubstantive = recs.some((r) => SUBSTANTIVE.has(r.candidateTech));
    const hasReadyOpportunity = recs.some(
      (r) => SUBSTANTIVE.has(r.candidateTech) && r.readiness === "ready_for_evaluation",
    );
    const needsInfo = recs.some((r) => r.readiness === "needs_info");
    const blocked = recs.some((r) => r.readiness === "has_dependencies") || needsInfo;
    return {
      activityId: a.id,
      order: a.order,
      relatedToPain: mainSignal != null && a.painSignals.includes(mainSignal as never),
      hasReadyOpportunity,
      hasSubstantive,
      blocked,
      systemsCount: a.systemIds.length,
    };
  });

  const candidates = scored.filter((s) => s.hasSubstantive);

  // Ordenação por precedência (seção 12).
  candidates.sort((a, b) => {
    if (a.relatedToPain !== b.relatedToPain) return a.relatedToPain ? -1 : 1;
    if (a.blocked !== b.blocked) return a.blocked ? 1 : -1;
    if (a.hasReadyOpportunity !== b.hasReadyOpportunity) return a.hasReadyOpportunity ? -1 : 1;
    if (a.systemsCount !== b.systemsCount) return a.systemsCount - b.systemsCount;
    return a.order - b.order;
  });

  const readyCandidates = candidates.filter((s) => s.hasReadyOpportunity && !s.blocked);

  if (readyCandidates.length === 0) {
    return {
      activityIds: candidates.slice(0, 3).map((s) => s.activityId),
      isDiscovery: true,
      reason:
        "Ainda não há base suficiente para um recorte pronto para avaliação. Recomendamos um recorte de descoberta com perguntas objetivas.",
    };
  }

  return {
    activityIds: readyCandidates.slice(0, 3).map((s) => s.activityId),
    isDiscovery: false,
    reason:
      "Atividades relacionadas à dor principal, sem bloqueios e com informações essenciais disponíveis.",
  };
}
