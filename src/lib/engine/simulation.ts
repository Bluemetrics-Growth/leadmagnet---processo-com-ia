import type { SimulationInput } from "@/lib/domain/schemas";
import type { SimulationResult } from "@/lib/domain/recommendations";

/* =========================================================================
   Simulação de esforço (seção 14). Função pura.
   O usuário informa o cenário proposto; Apollo e motor NÃO estimam ganho.
   Desconhecido nunca vira zero.
   ========================================================================= */

export function runSimulation(input: SimulationInput): SimulationResult {
  const notes: string[] = [];
  const { casesPerMonth, currentMinutesPerCase, proposedMinutesPerCase, hourlyCost } = input;

  const hasCoreInput =
    casesPerMonth != null && currentMinutesPerCase != null && proposedMinutesPerCase != null;

  if (!hasCoreInput) {
    if (casesPerMonth == null) notes.push("Informe os casos por mês.");
    if (currentMinutesPerCase == null) notes.push("Informe os minutos humanos atuais por caso.");
    if (proposedMinutesPerCase == null) notes.push("Informe os minutos humanos propostos por caso.");
    return {
      hasEnoughInput: false,
      currentHours: null,
      proposedHours: null,
      freedCapacityHours: null,
      equivalentValue: null,
      increasesEffort: false,
      notes,
    };
  }

  const currentHours = (casesPerMonth * currentMinutesPerCase) / 60;
  const proposedHours = (casesPerMonth * proposedMinutesPerCase) / 60;
  const freedCapacityHours = currentHours - proposedHours;
  const increasesEffort = freedCapacityHours < 0;

  const equivalentValue = hourlyCost != null ? freedCapacityHours * hourlyCost : null;
  if (hourlyCost == null) {
    notes.push("Sem custo por hora, o valor equivalente não é calculado.");
  }

  notes.push("Considere revisão e retrabalho ao informar os minutos médios.");
  notes.push("Capacidade liberada é esforço humano, não tempo total de atravessamento.");
  if (increasesEffort) {
    notes.push("O cenário proposto aumenta o esforço humano em vez de reduzir.");
  } else {
    notes.push("Resultado é uma referência informada por você, não uma economia garantida.");
  }

  return {
    hasEnoughInput: true,
    currentHours,
    proposedHours,
    freedCapacityHours,
    equivalentValue,
    increasesEffort,
    notes,
  };
}
