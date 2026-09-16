"use client";

import { useMemo, useState } from "react";
import type { Diagnostic, SimulationInput } from "@/lib/domain/schemas";
import { runSimulation } from "@/lib/engine";

interface Props {
  diagnostic: Diagnostic;
  update: (mutator: (d: Diagnostic) => Diagnostic) => void;
}

function parseNum(v: string): number | null {
  if (v.trim() === "") return null;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const HOURS = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

export function SimulationTab({ diagnostic, update }: Props) {
  const initial = diagnostic.simulation;
  const [cases, setCases] = useState(initial?.casesPerMonth?.toString() ?? "");
  const [current, setCurrent] = useState(initial?.currentMinutesPerCase?.toString() ?? "");
  const [proposed, setProposed] = useState(initial?.proposedMinutesPerCase?.toString() ?? "");
  const [cost, setCost] = useState(initial?.hourlyCost?.toString() ?? "");

  const input: SimulationInput = useMemo(
    () => ({
      casesPerMonth: parseNum(cases),
      currentMinutesPerCase: parseNum(current),
      proposedMinutesPerCase: parseNum(proposed),
      hourlyCost: parseNum(cost),
    }),
    [cases, current, proposed, cost],
  );

  const result = useMemo(() => runSimulation(input), [input]);

  function persist() {
    update((d) => ({ ...d, simulation: input }));
  }

  return (
    <div className="stack stack-5">
      <div className="stack stack-2">
        <h3 className="bm-h1">Simulação de esforço (opcional)</h3>
        <p className="bm-body-muted">
          Você informa o cenário proposto. O contexto empresarial e o motor de regras não estimam a redução
          de esforço. Considere revisão e retrabalho nos minutos médios.
        </p>
      </div>

      <div className="card grid-2" onBlur={persist}>
        <div className="field">
          <label htmlFor="s_cases">Casos por mês</label>
          <input id="s_cases" inputMode="decimal" value={cases} onChange={(e) => setCases(e.target.value)} placeholder="Ex.: 1000" />
        </div>
        <div className="field">
          <label htmlFor="s_cost">Custo por hora (R$)</label>
          <input id="s_cost" inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="Opcional" />
        </div>
        <div className="field">
          <label htmlFor="s_current">Minutos humanos atuais por caso</label>
          <input id="s_current" inputMode="decimal" value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="Ex.: 12" />
        </div>
        <div className="field">
          <label htmlFor="s_proposed">Minutos humanos propostos por caso</label>
          <input id="s_proposed" inputMode="decimal" value={proposed} onChange={(e) => setProposed(e.target.value)} placeholder="Ex.: 8" />
        </div>
      </div>

      {result.hasEnoughInput ? (
        <div className="card-stage grid-2">
          <Metric label="Horas atuais / mês" value={`${HOURS.format(result.currentHours!)} h`} />
          <Metric label="Horas propostas / mês" value={`${HOURS.format(result.proposedHours!)} h`} />
          <Metric
            label="Capacidade liberada / mês"
            value={`${HOURS.format(result.freedCapacityHours!)} h`}
            highlight={!result.increasesEffort}
            warn={result.increasesEffort}
          />
          <Metric
            label="Valor equivalente / mês"
            value={result.equivalentValue != null ? BRL.format(result.equivalentValue) : "—"}
          />
        </div>
      ) : (
        <p className="muted text-sm">Preencha casos, minutos atuais e minutos propostos para simular.</p>
      )}

      <ul className="stack stack-2 text-sm muted" style={{ margin: 0, paddingLeft: "var(--space-5)" }}>
        {result.notes.map((n) => (
          <li key={n}>{n}</li>
        ))}
      </ul>
    </div>
  );
}

function Metric({ label, value, highlight, warn }: { label: string; value: string; highlight?: boolean; warn?: boolean }) {
  const color = warn ? "var(--danger)" : highlight ? "var(--bm-blue)" : "var(--fg-1)";
  return (
    <div className="stack stack-1">
      <span className="provenance">{label}</span>
      <span style={{ fontFamily: "var(--font-display)", fontSize: "var(--fs-h2)", fontWeight: 600, color }}>{value}</span>
    </div>
  );
}
