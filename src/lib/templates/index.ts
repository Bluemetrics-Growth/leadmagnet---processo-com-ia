import { makeId } from "@/lib/id";
import {
  getTemplate,
  PROCESS_TEMPLATES,
  type ProcessTemplate,
} from "@/config/process-templates";
import type { Activity, Connection, Phase, ProcessGraph } from "@/lib/domain/schemas";

export { PROCESS_TEMPLATES, getTemplate };
export type { ProcessTemplate };

/** Cria uma atividade em branco (respostas desconhecidas) numa fase. */
export function makeBlankActivity(
  phaseId: string,
  order: number,
  overrides: Partial<Activity> = {},
): Activity {
  return {
    id: makeId("act"),
    phaseId,
    order,
    label: "Nova atividade",
    kind: "other",
    responsibleRole: null,
    systemIds: [],
    structuredInput: "unknown",
    objectiveRules: "unknown",
    interpretationRequired: "unknown",
    repetitive: "unknown",
    mandatoryHumanApproval: "unknown",
    accessMethod: "unknown",
    errorImpact: "unknown",
    painSignals: [],
    origin: "user",
    presenceConfirmed: false,
    notes: null,
    ...overrides,
  };
}

/**
 * Instancia um modelo em um ProcessGraph editável.
 * Atividades entram como sugestões (origin "template", não confirmadas) e
 * são ligadas em sequência simples; o usuário adiciona decisões e retornos.
 */
export function instantiateTemplate(templateId: string): ProcessGraph {
  const template = getTemplate(templateId) ?? getTemplate("custom")!;
  const phases: Phase[] = [];
  const activities: Activity[] = [];

  template.phases.forEach((phaseDef, phaseIndex) => {
    const phaseId = makeId("phase");
    phases.push({ id: phaseId, order: phaseIndex, label: phaseDef.label });
    phaseDef.activities.forEach((actDef) => {
      activities.push(
        makeBlankActivity(phaseId, activities.length, {
          label: actDef.label,
          kind: actDef.kind,
          origin: "template",
        }),
      );
    });
  });

  const connections: Connection[] = [];
  for (let i = 0; i < activities.length - 1; i++) {
    connections.push({
      id: makeId("conn"),
      from: activities[i].id,
      to: activities[i + 1].id,
      type: "sequence",
      condition: null,
    });
  }

  return { phases, activities, connections, systems: [] };
}
