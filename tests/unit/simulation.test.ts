import { describe, it, expect } from "vitest";
import { runSimulation } from "@/lib/engine/simulation";

describe("runSimulation", () => {
  it("caso de teste do PRD: 1000 casos, 12→8 min ≈ 66,67 h liberadas", () => {
    const r = runSimulation({
      casesPerMonth: 1000,
      currentMinutesPerCase: 12,
      proposedMinutesPerCase: 8,
      hourlyCost: null,
    });
    expect(r.hasEnoughInput).toBe(true);
    expect(r.freedCapacityHours).toBeCloseTo(66.6667, 3);
    expect(r.increasesEffort).toBe(false);
    expect(r.equivalentValue).toBeNull();
  });

  it("calcula valor equivalente quando há custo por hora", () => {
    const r = runSimulation({
      casesPerMonth: 1000,
      currentMinutesPerCase: 12,
      proposedMinutesPerCase: 8,
      hourlyCost: 90,
    });
    expect(r.equivalentValue).toBeCloseTo(6000, 2);
  });

  it("desconhecido não vira zero — falta entrada essencial", () => {
    const r = runSimulation({
      casesPerMonth: null,
      currentMinutesPerCase: 12,
      proposedMinutesPerCase: 8,
      hourlyCost: null,
    });
    expect(r.hasEnoughInput).toBe(false);
    expect(r.freedCapacityHours).toBeNull();
  });

  it("mostra aumento de esforço quando proposto é maior", () => {
    const r = runSimulation({
      casesPerMonth: 100,
      currentMinutesPerCase: 5,
      proposedMinutesPerCase: 9,
      hourlyCost: null,
    });
    expect(r.increasesEffort).toBe(true);
    expect(r.freedCapacityHours).toBeLessThan(0);
  });
});
