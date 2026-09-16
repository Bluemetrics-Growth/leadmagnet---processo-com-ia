import type { Activity, ProcessGraph } from "@/lib/domain/schemas";
import { RULES_VERSION } from "@/lib/domain/schemas";
import type {
  CandidateTech,
  ProposedActivityLayer,
  ReadinessState,
  Recommendation,
} from "@/lib/domain/recommendations";
import { ANSWER_LABELS, RULE_COPY } from "@/config/recommendation-copy";

/* =========================================================================
   Motor determinístico — regras R01..R12 (seção 11).
   Funções PURAS: mesmas entradas + versão de regras => mesmo resultado.
   Sem dependência de banco, rede ou interface.
   ========================================================================= */

const DEP_ACCESS_UNKNOWN = "Acesso aos dados não confirmado (informação declarada, não validada).";
const DEP_PROCESS_UNCONFIRMED = "Processo ainda não confirmado pelo usuário.";
const DEP_ESSENTIAL_UNKNOWN = "Características essenciais da atividade ainda desconhecidas.";

interface RawRec {
  ruleId: string;
  candidateTech: CandidateTech;
  supportingAnswers: string[];
  dependencies: string[];
  humanControl: string | null;
}

function fillCopy(template: string, activityLabel: string): string {
  return template.replaceAll("{atividade}", activityLabel);
}

function ans(activity: Activity, key: keyof typeof ANSWER_LABELS): string {
  return ANSWER_LABELS[key][activity[key] as "yes" | "no" | "unknown"];
}

/** Aplica as regras base a uma atividade (pode combinar IA, regras e integração). */
function baseRecommendations(a: Activity): RawRec[] {
  const recs: RawRec[] = [];

  // R01 — controle humano prevalece (precedência 1)
  if (a.mandatoryHumanApproval === "yes" || a.kind === "approve") {
    recs.push({
      ruleId: "R01",
      candidateTech: "human_control",
      supportingAnswers:
        a.mandatoryHumanApproval === "yes" ? [ans(a, "mandatoryHumanApproval")] : ["Atividade de aprovação"],
      dependencies: [],
      humanControl: RULE_COPY.R01.humanControl,
    });
  }

  // R02 — validar/calcular + critérios objetivos + sem interpretação
  if (
    (a.kind === "validate" || a.kind === "calculate") &&
    a.objectiveRules === "yes" &&
    a.interpretationRequired === "no"
  ) {
    recs.push({
      ruleId: "R02",
      candidateTech: "rules_or_calculation",
      supportingAnswers: [ans(a, "objectiveRules"), ans(a, "interpretationRequired")],
      dependencies: [],
      humanControl: null,
    });
  }

  // R03 — transferir/registrar + repetição
  if ((a.kind === "transfer" || a.kind === "record") && a.repetitive === "yes") {
    recs.push({
      ruleId: "R03",
      candidateTech: "integration",
      supportingAnswers: [ans(a, "repetitive")],
      dependencies: [],
      humanControl: null,
    });
  }

  // R05 — extrair/interpretar + interpretação necessária
  if ((a.kind === "extract" || a.kind === "interpret") && a.interpretationRequired === "yes") {
    recs.push({
      ruleId: "R05",
      candidateTech: "ai_assist",
      supportingAnswers: [ans(a, "interpretationRequired")],
      dependencies: [],
      humanControl: RULE_COPY.R05.humanControl,
    });
  }

  // R06 — encaminhar + critérios objetivos
  if (a.kind === "route" && a.objectiveRules === "yes") {
    recs.push({
      ruleId: "R06",
      candidateTech: "rules_or_calculation",
      supportingAnswers: [ans(a, "objectiveRules")],
      dependencies: [],
      humanControl: null,
    });
  }

  // R07 — encaminhar + interpretação necessária
  if (a.kind === "route" && a.interpretationRequired === "yes") {
    recs.push({
      ruleId: "R07",
      candidateTech: "assisted_classification",
      supportingAnswers: [ans(a, "interpretationRequired")],
      dependencies: [],
      humanControl: RULE_COPY.R07.humanControl,
    });
  }

  // R08 — inconsistência + critérios não definidos
  if (a.painSignals.includes("inconsistency") && a.objectiveRules === "no") {
    recs.push({
      ruleId: "R08",
      candidateTech: "define_criteria",
      supportingAnswers: ["Sinal de inconsistência", ans(a, "objectiveRules")],
      dependencies: [],
      humanControl: null,
    });
  }

  return recs;
}

/** Uma atividade tem informação essencial faltando para conclusão automática. */
function isEssentialUnknown(a: Activity): boolean {
  return a.objectiveRules === "unknown" && a.interpretationRequired === "unknown";
}

/**
 * Avalia uma atividade e retorna recomendações finais (com modificadores
 * R04, R09, R10, R11 e capa de preparação por R12).
 */
export function evaluateActivity(
  a: Activity,
  processConfirmed: boolean,
): { recommendations: Recommendation[]; essentialUnknown: boolean } {
  let raws = baseRecommendations(a);
  const substantiveKinds = new Set<CandidateTech>([
    "rules_or_calculation",
    "integration",
    "ai_assist",
    "assisted_classification",
    "define_criteria",
  ]);
  const hasSubstantive = raws.some((r) => substantiveKinds.has(r.candidateTech));

  // R04 — integração + acesso desconhecido => dependência
  raws = raws.map((r) => {
    if (r.candidateTech === "integration" && a.accessMethod === "unknown") {
      return {
        ...r,
        dependencies: [...r.dependencies, DEP_ACCESS_UNKNOWN],
      };
    }
    return r;
  });

  // R09 — impacto de erro alto ou desconhecido => revisão humana na proposta.
  // Aplica-se quando há recomendação substantiva sem controle humano ainda.
  const needsHumanReview = a.errorImpact === "high" || a.errorImpact === "unknown";
  if (needsHumanReview && hasSubstantive && !raws.some((r) => r.candidateTech === "human_control")) {
    raws.push({
      ruleId: "R09",
      candidateTech: "human_control",
      supportingAnswers: [`Impacto de erro: ${a.errorImpact === "high" ? "alto" : "desconhecido"}`],
      dependencies: [],
      humanControl: RULE_COPY.R09.humanControl,
    });
  }

  // R11 — atividade "outro" sem classificação suficiente => não recomendar.
  if (a.kind === "other" && !hasSubstantive) {
    raws.push({
      ruleId: "R11",
      candidateTech: "none",
      supportingAnswers: ["Tipo de atividade: outro"],
      dependencies: [],
      humanControl: null,
    });
  }

  // R10 — informação essencial desconhecida => avaliação incompleta.
  const essentialUnknown = isEssentialUnknown(a) && a.kind !== "other";
  if (essentialUnknown && !hasSubstantive) {
    raws.push({
      ruleId: "R10",
      candidateTech: "discovery",
      supportingAnswers: [ans(a, "objectiveRules"), ans(a, "interpretationRequired")],
      dependencies: [DEP_ESSENTIAL_UNKNOWN],
      humanControl: null,
    });
  }

  const recommendations: Recommendation[] = raws.map((r, i) => {
    const copy = RULE_COPY[r.ruleId];
    let dependencies = [...r.dependencies];

    // R12 — processo não confirmado limita conclusões categóricas.
    if (!processConfirmed) dependencies = [...dependencies, DEP_PROCESS_UNCONFIRMED];

    const readiness = computeReadiness(r.ruleId, dependencies);
    return {
      id: `${a.id}::${r.ruleId}::${i}`,
      activityId: a.id,
      activityLabel: a.label,
      ruleId: r.ruleId,
      rulesVersion: RULES_VERSION,
      proposedChange: fillCopy(copy.proposedChange, a.label),
      candidateTech: r.candidateTech,
      supportingAnswers: r.supportingAnswers,
      dependencies,
      humanControl: r.humanControl ?? copy.humanControl,
      metric: copy.metric,
      readiness,
    };
  });

  return { recommendations, essentialUnknown };
}

function computeReadiness(ruleId: string, dependencies: string[]): ReadinessState {
  if (ruleId === "R10" || ruleId === "R11") return "needs_info";
  if (dependencies.length > 0) return "has_dependencies";
  return "ready_for_evaluation";
}

/** Descreve, de forma legível, como a atividade é executada hoje. */
export function describeCurrentExecution(a: Activity): string {
  const parts: string[] = [];
  const kindLabel: Record<Activity["kind"], string> = {
    receive: "recebimento",
    extract: "extração de informações",
    interpret: "interpretação de conteúdo",
    validate: "validação",
    calculate: "cálculo",
    transfer: "transferência",
    route: "encaminhamento",
    approve: "aprovação",
    communicate: "comunicação",
    record: "registro",
    other: "tarefa",
  };
  parts.push(`Execução atual: ${kindLabel[a.kind]}`);
  if (a.responsibleRole) parts.push(`responsável: ${a.responsibleRole}`);
  if (a.mandatoryHumanApproval === "yes") parts.push("com aprovação humana");
  if (a.painSignals.length > 0) parts.push(`sinais: ${a.painSignals.length}`);
  return parts.join(", ") + ".";
}

/** Camada proposta por atividade (comparação atual/proposto — seção 13). */
export function buildProposedLayer(
  graph: ProcessGraph,
  recommendationsByActivity: Map<string, Recommendation[]>,
): ProposedActivityLayer[] {
  return graph.activities.map((a) => {
    const recs = recommendationsByActivity.get(a.id) ?? [];
    // Escolhe a recomendação substantiva de maior prioridade para a proposta.
    const primary =
      recs.find((r) => r.candidateTech !== "human_control" && r.candidateTech !== "none") ?? null;
    const humanRec = recs.find((r) => r.candidateTech === "human_control") ?? null;
    const dependencies = Array.from(new Set(recs.flatMap((r) => r.dependencies)));
    return {
      activityId: a.id,
      activityLabel: a.label,
      currentExecution: describeCurrentExecution(a),
      proposedChange: primary ? primary.proposedChange : null,
      candidateTech: primary?.candidateTech ?? "none",
      humanResponsibility: humanRec?.humanControl ?? (a.mandatoryHumanApproval === "yes" ? "Aprovação humana mantida." : null),
      dependencies,
    };
  });
}
