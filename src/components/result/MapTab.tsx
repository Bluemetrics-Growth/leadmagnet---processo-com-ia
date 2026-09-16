"use client";

import { useState } from "react";
import type { Diagnostic } from "@/lib/domain/schemas";
import type { EvaluationResult, Recommendation } from "@/lib/domain/recommendations";
import { CANDIDATE_TECH_LABEL } from "@/config/recommendation-copy";
import { KIND_LABELS } from "@/lib/domain/labels";
import { phaseActivities } from "@/lib/domain/graph-ops";
import { ProcessGraphView } from "@/components/process-graph/ProcessGraph";

const TECH_CHIP: Record<string, string> = {
  human_control: "chip-gray",
  rules_or_calculation: "chip-cyan",
  integration: "chip-purple",
  ai_assist: "chip-blue",
  assisted_classification: "chip-blue",
  define_criteria: "chip-orange",
  discovery: "chip-orange",
  none: "chip-gray",
};

export function MapTab({ diagnostic, evaluation }: { diagnostic: Diagnostic; evaluation: EvaluationResult }) {
  const [mode, setMode] = useState<"current" | "proposed">("current");
  const [showFlow, setShowFlow] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const byActivity = new Map<string, Recommendation[]>();
  for (const rec of evaluation.recommendations) {
    const list = byActivity.get(rec.activityId) ?? [];
    list.push(rec);
    byActivity.set(rec.activityId, list);
  }

  const phases = [...diagnostic.current.phases].sort((a, b) => a.order - b.order);
  const selectedRecs = selected ? byActivity.get(selected) ?? [] : [];
  const selectedActivity = selected ? diagnostic.current.activities.find((a) => a.id === selected) : null;

  return (
    <div className="stack stack-4">
      <div className="row row-between no-print">
        <div className="row" style={{ gap: 0, border: "1px solid var(--border)", borderRadius: "var(--radius-pill)", overflow: "hidden" }}>
          <button className={`btn btn-sm ${mode === "current" ? "btn-primary" : "btn-ghost"}`} style={{ borderRadius: 0, boxShadow: "none" }} onClick={() => setMode("current")}>
            Atual
          </button>
          <button className={`btn btn-sm ${mode === "proposed" ? "btn-primary" : "btn-ghost"}`} style={{ borderRadius: 0, boxShadow: "none" }} onClick={() => setMode("proposed")}>
            Proposto
          </button>
        </div>
        <button className="btn btn-tertiary btn-sm" onClick={() => setShowFlow((s) => !s)}>
          {showFlow ? "Ver quadro" : "Ver conexões (fluxo)"}
        </button>
      </div>

      {showFlow ? (
        <div className="card">
          <ProcessGraphView graph={diagnostic.current} />
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gap: "var(--space-4)",
            gridTemplateColumns: `repeat(${Math.max(phases.length, 1)}, minmax(220px, 1fr))`,
            overflowX: "auto",
          }}
        >
          {phases.map((phase) => (
            <div key={phase.id} className="card-stage stack stack-3">
              <div className="text-sm" style={{ fontWeight: 600, fontFamily: "var(--font-display)" }}>{phase.label}</div>
              {phaseActivities(diagnostic.current, phase.id).map((a) => {
                const recs = byActivity.get(a.id) ?? [];
                const techs = Array.from(new Set(recs.map((r) => r.candidateTech))).filter((t) => t !== "none");
                return (
                  <div
                    key={a.id}
                    className={`card ${selected === a.id ? "card-selected" : ""}`}
                    style={{ padding: "var(--space-3)", cursor: "pointer" }}
                    onClick={() => setSelected(a.id)}
                  >
                    <div className="row row-between">
                      <span style={{ fontWeight: 500, fontSize: "var(--fs-body-sm)" }}>{a.label}</span>
                      <span className="chip chip-gray" style={{ padding: "2px 8px" }}>{KIND_LABELS[a.kind]}</span>
                    </div>
                    {mode === "proposed" && techs.length > 0 && (
                      <div className="row" style={{ gap: 4, marginTop: 6 }}>
                        {techs.map((t) => (
                          <span key={t} className={`chip ${TECH_CHIP[t]}`} style={{ padding: "2px 8px" }}>
                            {CANDIDATE_TECH_LABEL[t]}
                          </span>
                        ))}
                      </div>
                    )}
                    {mode === "proposed" && a.mandatoryHumanApproval === "yes" && (
                      <div className="chip chip-gray" style={{ padding: "2px 8px", marginTop: 6 }}>Pessoa</div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {selectedActivity && (
        <div className="card stack stack-3">
          <div className="row row-between">
            <span className="eyebrow">{selectedActivity.label}</span>
            <button className="btn btn-ghost btn-sm no-print" onClick={() => setSelected(null)}>Fechar</button>
          </div>
          {selectedRecs.length === 0 ? (
            <p className="muted text-sm">Nenhuma recomendação para esta atividade com as informações atuais.</p>
          ) : (
            selectedRecs.map((r) => (
              <div key={r.id} className="stack stack-2" style={{ borderLeft: "3px solid var(--accent-soft)", paddingLeft: "var(--space-3)" }}>
                <div className="row" style={{ gap: 6 }}>
                  <span className={`chip ${TECH_CHIP[r.candidateTech]}`} style={{ padding: "2px 8px" }}>{CANDIDATE_TECH_LABEL[r.candidateTech]}</span>
                  <span className="chip chip-gray" style={{ padding: "2px 8px" }}>{r.ruleId}</span>
                </div>
                <p className="text-sm">{r.proposedChange}</p>
                {r.humanControl && <p className="text-sm muted">Controle humano: {r.humanControl}</p>}
                {r.dependencies.length > 0 && <p className="text-sm muted">Dependências: {r.dependencies.join("; ")}</p>}
                <p className="text-sm muted">Métrica: {r.metric}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
