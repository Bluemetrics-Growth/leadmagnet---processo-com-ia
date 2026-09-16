"use client";

import { useEffect, useMemo, useState } from "react";
import type { Diagnostic } from "@/lib/domain/schemas";
import { evaluateWithScope } from "@/lib/engine";
import { track } from "@/lib/analytics/events";
import { MapTab } from "./MapTab";
import { ScopeTab } from "./ScopeTab";
import { OpportunitiesTab } from "@/components/opportunities/OpportunitiesTab";
import { SimulationTab } from "@/components/simulation/SimulationTab";
import { LeadCapture } from "@/components/lead-capture/LeadCapture";
import { ContactRequest } from "./ContactRequest";

interface Props {
  diagnostic: Diagnostic;
  update: (mutator: (d: Diagnostic) => Diagnostic) => void;
  goBack: () => void;
}

type Tab = "map" | "opportunities" | "scope" | "simulation";
const TABS: { id: Tab; label: string }[] = [
  { id: "map", label: "Mapa" },
  { id: "opportunities", label: "Oportunidades" },
  { id: "scope", label: "Primeiro recorte" },
  { id: "simulation", label: "Simulação" },
];

export function ResultStep({ diagnostic, update, goBack }: Props) {
  const [tab, setTab] = useState<Tab>("map");
  const { evaluation, suggestedScope } = useMemo(() => evaluateWithScope(diagnostic), [diagnostic]);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(diagnostic.scope?.activityIds ?? suggestedScope.activityIds),
  );
  function toggle(activityId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(activityId)) next.delete(activityId);
      else next.add(activityId);
      return next;
    });
  }

  useEffect(() => {
    track("recommendations_viewed", {
      opportunities: evaluation.summary.opportunities,
      status: evaluation.status,
    });
  }, [evaluation.summary.opportunities, evaluation.status]);

  const company = diagnostic.company.confirmed;
  const companyName = company.operationUnit.value || company.name.value || "Empresa não confirmada";

  return (
    <div className="stack stack-6">
      {/* Cabeçalho do resultado (seção T5) */}
      <div className="card-stage stack stack-3">
        <div className="row row-between">
          <div className="stack stack-1">
            <span className="eyebrow">{companyName}</span>
            <h2 className="bm-display-m">{diagnostic.process?.name ?? "Processo"}</h2>
          </div>
          <span className={`chip ${evaluation.status === "confirmed" ? "chip-green" : "chip-orange"}`}>
            {evaluation.status === "confirmed" ? "Processo confirmado" : "Preliminar"}
          </span>
        </div>
        <div className="row" style={{ gap: "var(--space-5)" }}>
          <HeaderStat label="Atividades" value={evaluation.summary.activities} />
          <HeaderStat label="Oportunidades" value={evaluation.summary.opportunities} />
          <HeaderStat label="Prontas p/ avaliação" value={evaluation.summary.readyForEvaluation} />
          <HeaderStat label="Dependências pendentes" value={evaluation.pendingDependencies.length} />
        </div>
      </div>

      {/* Abas */}
      <div className="row no-print" role="tablist" style={{ gap: "var(--space-2)", flexWrap: "wrap" }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            className={`btn btn-sm ${tab === t.id ? "btn-primary" : "btn-tertiary"}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div>
        {tab === "map" && <MapTab diagnostic={diagnostic} evaluation={evaluation} />}
        {tab === "opportunities" && (
          <OpportunitiesTab evaluation={evaluation} selectedIds={selectedIds} toggle={toggle} />
        )}
        {tab === "scope" && (
          <ScopeTab
            diagnostic={diagnostic}
            update={update}
            suggestedScope={suggestedScope}
            selectedIds={selectedIds}
            toggle={toggle}
          />
        )}
        {tab === "simulation" && <SimulationTab diagnostic={diagnostic} update={update} />}
      </div>

      <hr className="divider" />
      <LeadCapture diagnostic={diagnostic} evaluation={evaluation} />
      <ContactRequest diagnostic={diagnostic} />

      <div className="row no-print">
        <button className="btn btn-ghost" onClick={goBack}>
          ‹ Voltar às atividades
        </button>
      </div>

      <p className="provenance text-center">
        Diagnóstico preliminar e explicável. Não representa promessa de viabilidade em produção.
      </p>
    </div>
  );
}

function HeaderStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="stack stack-1">
      <span style={{ fontFamily: "var(--font-display)", fontSize: "var(--fs-display-m)", fontWeight: 600, lineHeight: 1 }}>
        {value}
      </span>
      <span className="provenance">{label}</span>
    </div>
  );
}
