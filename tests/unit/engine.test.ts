import { describe, it, expect } from "vitest";
import { createDiagnostic } from "@/lib/domain/factory";
import { makeBlankActivity } from "@/lib/templates";
import { evaluateDiagnostic, evaluateWithScope } from "@/lib/engine";
import type { Activity, Diagnostic } from "@/lib/domain/schemas";

function mkActivity(overrides: Partial<Activity>): Activity {
  return makeBlankActivity("phase_1", 0, overrides);
}

function mkDiag(activities: Activity[], confirmed: boolean): Diagnostic {
  const d = createDiagnostic();
  return {
    ...d,
    currentConfirmed: confirmed,
    status: confirmed ? "confirmed" : "preliminary",
    process: {
      templateId: "custom",
      name: "Processo teste",
      trigger: "início",
      completion: "fim",
      mainProblem: "manual_work",
      area: null,
      extraContext: null,
    },
    current: {
      phases: [{ id: "phase_1", order: 0, label: "Fase" }],
      activities,
      connections: [],
      systems: [],
    },
  };
}

describe("motor determinístico", () => {
  it("R01 — preserva controle humano em aprovação obrigatória", () => {
    const a = mkActivity({ id: "a1", kind: "validate", mandatoryHumanApproval: "yes", errorImpact: "low" });
    const res = evaluateDiagnostic(mkDiag([a], true));
    const r01 = res.recommendations.find((r) => r.ruleId === "R01");
    expect(r01).toBeDefined();
    expect(r01!.candidateTech).toBe("human_control");
  });

  it("R02 — regras/cálculo com critérios objetivos e sem interpretação", () => {
    const a = mkActivity({
      id: "a1",
      kind: "calculate",
      objectiveRules: "yes",
      interpretationRequired: "no",
      errorImpact: "low",
    });
    const res = evaluateDiagnostic(mkDiag([a], true));
    const r02 = res.recommendations.find((r) => r.ruleId === "R02");
    expect(r02?.candidateTech).toBe("rules_or_calculation");
    expect(r02?.readiness).toBe("ready_for_evaluation");
  });

  it("R03 + R04 — integração repetitiva com acesso desconhecido vira dependência", () => {
    const a = mkActivity({
      id: "a1",
      kind: "record",
      repetitive: "yes",
      accessMethod: "unknown",
      errorImpact: "low",
    });
    const res = evaluateDiagnostic(mkDiag([a], true));
    const r03 = res.recommendations.find((r) => r.ruleId === "R03");
    expect(r03?.candidateTech).toBe("integration");
    expect(r03?.dependencies.length).toBeGreaterThan(0);
    expect(r03?.readiness).toBe("has_dependencies");
  });

  it("R05 — assistência por IA quando é necessário interpretar", () => {
    const a = mkActivity({
      id: "a1",
      kind: "extract",
      interpretationRequired: "yes",
      errorImpact: "low",
    });
    const res = evaluateDiagnostic(mkDiag([a], true));
    expect(res.recommendations.some((r) => r.ruleId === "R05" && r.candidateTech === "ai_assist")).toBe(true);
  });

  it("R09 — impacto de erro desconhecido inclui revisão humana", () => {
    const a = mkActivity({
      id: "a1",
      kind: "extract",
      interpretationRequired: "yes",
      errorImpact: "unknown",
    });
    const res = evaluateDiagnostic(mkDiag([a], true));
    expect(res.recommendations.some((r) => r.ruleId === "R09" && r.candidateTech === "human_control")).toBe(true);
  });

  it("R10 — informação essencial desconhecida marca avaliação incompleta", () => {
    const a = mkActivity({ id: "a1", kind: "receive" }); // objectiveRules e interpretation unknown
    const res = evaluateDiagnostic(mkDiag([a], true));
    expect(res.incomplete).toBe(true);
    expect(res.recommendations.some((r) => r.ruleId === "R10")).toBe(true);
  });

  it("R12 — processo não confirmado => resultado preliminar e dependência", () => {
    const a = mkActivity({
      id: "a1",
      kind: "calculate",
      objectiveRules: "yes",
      interpretationRequired: "no",
      errorImpact: "low",
    });
    const res = evaluateDiagnostic(mkDiag([a], false));
    expect(res.status).toBe("preliminary");
    const r02 = res.recommendations.find((r) => r.ruleId === "R02");
    expect(r02?.dependencies.some((d) => d.includes("não confirmado"))).toBe(true);
    // Sem confirmação, nada é "pronto para avaliação".
    expect(r02?.readiness).toBe("has_dependencies");
  });

  it("é determinístico — mesma entrada, mesmo resultado", () => {
    const a = mkActivity({
      id: "a1",
      kind: "calculate",
      objectiveRules: "yes",
      interpretationRequired: "no",
      errorImpact: "low",
    });
    const diag = mkDiag([a], true);
    expect(evaluateDiagnostic(diag)).toEqual(evaluateDiagnostic(diag));
  });

  it("recorte sugere atividades e cai em descoberta quando não há base", () => {
    const a = mkActivity({ id: "a1", kind: "other" });
    const { suggestedScope } = evaluateWithScope(mkDiag([a], true));
    expect(suggestedScope.isDiscovery).toBe(true);
  });
});
