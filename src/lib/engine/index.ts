import type { Diagnostic } from "@/lib/domain/schemas";
import type { EvaluationResult, Recommendation, SuggestedScope } from "@/lib/domain/recommendations";
import { RULES_VERSION } from "@/lib/domain/schemas";
import { buildProposedLayer, evaluateActivity } from "./rules";
import { suggestScope } from "./priorities";
import { runSimulation } from "./simulation";

export { evaluateActivity, buildProposedLayer, describeCurrentExecution } from "./rules";
export { suggestScope } from "./priorities";
export { runSimulation } from "./simulation";

/* =========================================================================
   Ponto de entrada do motor. Recebe um diagnóstico e devolve o resultado
   determinístico completo. Puro: não persiste, não chama rede.
   ========================================================================= */

export function evaluateDiagnostic(diagnostic: Diagnostic): EvaluationResult {
  const processConfirmed = diagnostic.currentConfirmed;
  const graph = diagnostic.current;

  const recommendationsByActivity = new Map<string, Recommendation[]>();
  let incomplete = false;

  for (const activity of graph.activities) {
    const { recommendations, essentialUnknown } = evaluateActivity(activity, processConfirmed);
    recommendationsByActivity.set(activity.id, recommendations);
    if (essentialUnknown) incomplete = true;
  }

  const recommendations = graph.activities.flatMap(
    (a) => recommendationsByActivity.get(a.id) ?? [],
  );
  const proposedLayer = buildProposedLayer(graph, recommendationsByActivity);

  const pendingDependencies = Array.from(
    new Set(recommendations.flatMap((r) => r.dependencies)),
  );

  const readyForEvaluation = recommendations.filter(
    (r) => r.readiness === "ready_for_evaluation",
  ).length;
  const needsInfo = recommendations.filter((r) => r.readiness === "needs_info").length;
  const hasDependencies = recommendations.filter((r) => r.readiness === "has_dependencies").length;

  // R12 — processo não confirmado => resultado preliminar.
  const status: "preliminary" | "confirmed" = processConfirmed ? "confirmed" : "preliminary";

  return {
    diagnosticId: diagnostic.id,
    status,
    rulesVersion: RULES_VERSION,
    recommendations,
    proposedLayer,
    pendingDependencies,
    incomplete: incomplete || needsInfo > 0,
    summary: {
      activities: graph.activities.length,
      opportunities: recommendations.filter(
        (r) => r.candidateTech !== "human_control" && r.candidateTech !== "none",
      ).length,
      readyForEvaluation,
      needsInfo,
      hasDependencies,
    },
  };
}

/** Conveniência: avalia e já sugere um recorte. */
export function evaluateWithScope(diagnostic: Diagnostic): {
  evaluation: EvaluationResult;
  suggestedScope: SuggestedScope;
} {
  const evaluation = evaluateDiagnostic(diagnostic);
  const byActivity = new Map<string, Recommendation[]>();
  for (const rec of evaluation.recommendations) {
    const list = byActivity.get(rec.activityId) ?? [];
    list.push(rec);
    byActivity.set(rec.activityId, list);
  }
  const suggestedScope = suggestScope(diagnostic.current, byActivity, diagnostic.process);
  return { evaluation, suggestedScope };
}

export { runSimulation as simulate };
