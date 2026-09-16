import { makeId } from "@/lib/id";
import { makeBlankActivity } from "@/lib/templates";
import type { Activity, Connection, Phase, ProcessGraph } from "./schemas";
import { PRODUCT } from "@/config/product";

/* =========================================================================
   Operações imutáveis sobre o grafo de processo (edição em T3).
   Cada função devolve um novo grafo — habilita histórico/undo trivialmente.
   ========================================================================= */

function reindexActivities(activities: Activity[]): Activity[] {
  return activities.map((a, i) => ({ ...a, order: i }));
}

export function phaseActivities(graph: ProcessGraph, phaseId: string): Activity[] {
  return graph.activities.filter((a) => a.phaseId === phaseId).sort((a, b) => a.order - b.order);
}

export function renamePhase(graph: ProcessGraph, phaseId: string, label: string): ProcessGraph {
  return { ...graph, phases: graph.phases.map((p) => (p.id === phaseId ? { ...p, label } : p)) };
}

export function addPhase(graph: ProcessGraph): ProcessGraph {
  if (graph.phases.length >= PRODUCT.limits.maxPhases) return graph;
  const phase: Phase = { id: makeId("phase"), order: graph.phases.length, label: "Nova fase" };
  return { ...graph, phases: [...graph.phases, phase] };
}

export function removePhase(graph: ProcessGraph, phaseId: string): ProcessGraph {
  if (graph.phases.length <= PRODUCT.limits.minPhases) return graph;
  const removedActs = new Set(graph.activities.filter((a) => a.phaseId === phaseId).map((a) => a.id));
  const activities = reindexActivities(graph.activities.filter((a) => a.phaseId !== phaseId));
  const connections = graph.connections.filter((c) => !removedActs.has(c.from) && !removedActs.has(c.to));
  const phases = graph.phases.filter((p) => p.id !== phaseId).map((p, i) => ({ ...p, order: i }));
  return { ...graph, phases, activities, connections };
}

export function addActivity(graph: ProcessGraph, phaseId: string): ProcessGraph {
  if (graph.activities.length >= PRODUCT.limits.maxActivities) return graph;
  const activity = makeBlankActivity(phaseId, graph.activities.length);
  return { ...graph, activities: [...graph.activities, activity] };
}

export function updateActivity(graph: ProcessGraph, activity: Activity): ProcessGraph {
  return { ...graph, activities: graph.activities.map((a) => (a.id === activity.id ? activity : a)) };
}

export function removeActivity(graph: ProcessGraph, activityId: string): ProcessGraph {
  const activities = reindexActivities(graph.activities.filter((a) => a.id !== activityId));
  const connections = graph.connections.filter((c) => c.from !== activityId && c.to !== activityId);
  return { ...graph, activities, connections };
}

/** Move uma atividade para cima/baixo dentro da própria fase. */
export function moveActivity(graph: ProcessGraph, activityId: string, dir: -1 | 1): ProcessGraph {
  const target = graph.activities.find((a) => a.id === activityId);
  if (!target) return graph;
  const siblings = phaseActivities(graph, target.phaseId);
  const idx = siblings.findIndex((a) => a.id === activityId);
  const swapWith = siblings[idx + dir];
  if (!swapWith) return graph;
  const activities = graph.activities.map((a) => {
    if (a.id === target.id) return { ...a, order: swapWith.order };
    if (a.id === swapWith.id) return { ...a, order: target.order };
    return a;
  });
  return { ...graph, activities: reindexActivities([...activities].sort((x, y) => x.order - y.order)) };
}

/** Move uma atividade para outra fase (mantém no fim da fase destino). */
export function moveActivityToPhase(graph: ProcessGraph, activityId: string, phaseId: string): ProcessGraph {
  const activities = graph.activities.map((a) =>
    a.id === activityId ? { ...a, phaseId, order: graph.activities.length } : a,
  );
  return { ...graph, activities: reindexActivities([...activities].sort((x, y) => x.order - y.order)) };
}

export function addConnection(graph: ProcessGraph, conn: Omit<Connection, "id">): ProcessGraph {
  return { ...graph, connections: [...graph.connections, { ...conn, id: makeId("conn") }] };
}

export function removeConnection(graph: ProcessGraph, connId: string): ProcessGraph {
  return { ...graph, connections: graph.connections.filter((c) => c.id !== connId) };
}

/* --- Sistemas ----------------------------------------------------------- */
export function upsertSystem(graph: ProcessGraph, name: string): { graph: ProcessGraph; id: string } {
  const existing = graph.systems.find((s) => s.name.toLowerCase() === name.toLowerCase());
  if (existing) return { graph, id: existing.id };
  const id = makeId("sys");
  return { graph: { ...graph, systems: [...graph.systems, { id, name }] }, id };
}

/* --- Validação de estrutura (seção T3) --------------------------------- */
export interface StructureValidation {
  ok: boolean;
  errors: string[];
}

export function validateStructure(graph: ProcessGraph): StructureValidation {
  const errors: string[] = [];
  const { limits } = PRODUCT;

  if (graph.phases.length < limits.minPhases || graph.phases.length > limits.maxPhases) {
    errors.push(`O processo deve ter entre ${limits.minPhases} e ${limits.maxPhases} fases.`);
  }
  if (graph.activities.length < limits.minActivities || graph.activities.length > limits.maxActivities) {
    errors.push(`O processo deve ter entre ${limits.minActivities} e ${limits.maxActivities} atividades.`);
  }

  // Um início e pelo menos um encerramento (por conexões de sequência/decisão).
  const flow = graph.connections.filter((c) => c.type !== "return");
  const hasTargets = new Set(flow.map((c) => c.to));
  const hasSources = new Set(flow.map((c) => c.from));
  const starts = graph.activities.filter((a) => !hasTargets.has(a.id));
  const ends = graph.activities.filter((a) => !hasSources.has(a.id));

  if (graph.activities.length > 0 && starts.length === 0) {
    errors.push("Defina ao menos um início (atividade sem entrada).");
  }
  if (graph.activities.length > 0 && ends.length === 0) {
    errors.push("Defina ao menos um encerramento (atividade sem saída).");
  }

  // Até 3 saídas por decisão.
  for (const a of graph.activities) {
    const outs = flow.filter((c) => c.from === a.id).length;
    if (outs > limits.maxDecisionOutputs) {
      errors.push(`A atividade “${a.label}” tem mais de ${limits.maxDecisionOutputs} saídas.`);
    }
  }

  return { ok: errors.length === 0, errors };
}
