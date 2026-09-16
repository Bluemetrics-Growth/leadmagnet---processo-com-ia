import type { Diagnostic } from "@/lib/domain/schemas";
import type { EvaluationResult } from "@/lib/domain/recommendations";
import { CANDIDATE_TECH_LABEL } from "@/config/recommendation-copy";
import { PROBLEM_LABELS } from "@/lib/domain/labels";

/* =========================================================================
   Exportação em Markdown (seção 6). Inclui versões de modelo e regras.
   ========================================================================= */

const READINESS_LABEL = {
  ready_for_evaluation: "Pronto para avaliação",
  has_dependencies: "Tem dependências",
  needs_info: "Precisa de informação",
} as const;

export function diagnosticToMarkdown(diagnostic: Diagnostic, evaluation: EvaluationResult): string {
  const c = diagnostic.company.confirmed;
  const lines: string[] = [];

  lines.push(`# Mapa de Automação — ${c.name.value ?? "Empresa não confirmada"}`);
  lines.push("");
  lines.push(
    `> Estado: **${evaluation.status === "confirmed" ? "Processo confirmado" : "Preliminar"}** · ` +
      `Regras v${diagnostic.rulesVersion} · Modelos v${diagnostic.templatesVersion}`,
  );
  lines.push("");

  lines.push("## Contexto empresarial");
  lines.push(`- Empresa: ${c.name.value ?? "—"}`);
  lines.push(`- Domínio: ${c.domain.value ?? "—"}`);
  lines.push(`- Setor: ${c.industry.value ?? "—"}`);
  lines.push(`- Porte: ${c.employeeRange.value ?? "—"}`);
  lines.push(`- Localização: ${c.location.value ?? "—"}`);
  if (c.operationUnit.value) lines.push(`- Unidade/operação: ${c.operationUnit.value}`);
  lines.push("");

  if (diagnostic.process) {
    lines.push("## Processo");
    lines.push(`- Nome: ${diagnostic.process.name}`);
    lines.push(`- Início: ${diagnostic.process.trigger}`);
    lines.push(`- Conclusão: ${diagnostic.process.completion}`);
    lines.push(`- Problema principal: ${PROBLEM_LABELS[diagnostic.process.mainProblem]}`);
    if (diagnostic.process.area) lines.push(`- Área responsável: ${diagnostic.process.area}`);
    lines.push("");
  }

  lines.push("## Processo atual (fases e atividades)");
  for (const phase of [...diagnostic.current.phases].sort((a, b) => a.order - b.order)) {
    lines.push(`### ${phase.label}`);
    const acts = diagnostic.current.activities
      .filter((a) => a.phaseId === phase.id)
      .sort((a, b) => a.order - b.order);
    for (const a of acts) {
      const role = a.responsibleRole ? ` — ${a.responsibleRole}` : "";
      lines.push(`- ${a.label}${role}`);
    }
    lines.push("");
  }

  lines.push("## Oportunidades");
  if (evaluation.recommendations.length === 0) {
    lines.push("_Nenhuma recomendação gerada com as informações atuais._");
  }
  for (const rec of evaluation.recommendations) {
    lines.push(`### ${rec.activityLabel} — ${CANDIDATE_TECH_LABEL[rec.candidateTech]} (${rec.ruleId})`);
    lines.push(rec.proposedChange);
    lines.push("");
    lines.push(`- Estado: ${READINESS_LABEL[rec.readiness]}`);
    if (rec.supportingAnswers.length) lines.push(`- Baseado em: ${rec.supportingAnswers.join("; ")}`);
    if (rec.humanControl) lines.push(`- Controle humano: ${rec.humanControl}`);
    if (rec.dependencies.length) lines.push(`- Dependências: ${rec.dependencies.join("; ")}`);
    lines.push(`- Métrica: ${rec.metric}`);
    lines.push(`- Regra: ${rec.ruleId} (v${rec.rulesVersion})`);
    lines.push("");
  }

  if (diagnostic.scope) {
    lines.push("## Primeiro recorte");
    lines.push(diagnostic.scope.objective || "_Objetivo não definido._");
    lines.push("");
    lines.push("Atividades incluídas:");
    for (const id of diagnostic.scope.activityIds) {
      const a = diagnostic.current.activities.find((x) => x.id === id);
      if (a) lines.push(`- ${a.label}`);
    }
    lines.push("");
  }

  lines.push("---");
  lines.push("Diagnóstico preliminar e explicável. Não representa promessa de viabilidade em produção.");
  return lines.join("\n");
}
