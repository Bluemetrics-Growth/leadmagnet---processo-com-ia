"use client";

import type { EvaluationResult, ReadinessState, Recommendation } from "@/lib/domain/recommendations";
import { CANDIDATE_TECH_LABEL } from "@/config/recommendation-copy";

const READINESS: Record<ReadinessState, { label: string; chip: string }> = {
  ready_for_evaluation: { label: "Pronto para avaliação", chip: "chip-green" },
  has_dependencies: { label: "Tem dependências", chip: "chip-orange" },
  needs_info: { label: "Precisa de informação", chip: "chip-cyan" },
};

const ORDER: ReadinessState[] = ["ready_for_evaluation", "has_dependencies", "needs_info"];

export function OpportunitiesTab({
  evaluation,
  selectedIds,
  toggle,
}: {
  evaluation: EvaluationResult;
  selectedIds: Set<string>;
  toggle: (activityId: string) => void;
}) {
  // Oportunidades reais (exclui controle humano puro e "sem recomendação").
  const opportunities = evaluation.recommendations.filter(
    (r) => r.candidateTech !== "human_control" && r.candidateTech !== "none",
  );

  const grouped: Record<ReadinessState, Recommendation[]> = {
    ready_for_evaluation: [],
    has_dependencies: [],
    needs_info: [],
  };
  for (const r of opportunities) grouped[r.readiness].push(r);

  return (
    <div className="stack stack-5">
      {evaluation.incomplete && (
        <div className="card" style={{ borderColor: "var(--bm-cyan)" }}>
          <span className="chip chip-cyan"><span className="dot" style={{ background: "var(--bm-cyan)" }} />Avaliação incompleta</span>
          <p className="text-sm muted" style={{ marginTop: "var(--space-2)" }}>
            Algumas atividades ainda têm informações essenciais em aberto. As recomendações abaixo já são
            possíveis, mas o diagnóstico permanece preliminar.
          </p>
        </div>
      )}

      {opportunities.length === 0 && (
        <p className="muted">
          Ainda não há oportunidades com as informações atuais. Volte às atividades e responda as
          características para gerar recomendações.
        </p>
      )}

      {ORDER.map((state) =>
        grouped[state].length === 0 ? null : (
          <div key={state} className="stack stack-3">
            <div className="row">
              <span className={`chip ${READINESS[state].chip}`}>{READINESS[state].label}</span>
              <span className="muted text-sm">{grouped[state].length} oportunidade(s)</span>
            </div>
            {grouped[state].map((r) => (
              <div key={r.id} className="card stack stack-3">
                <div className="row row-between">
                  <div className="row" style={{ gap: 6 }}>
                    <span className="chip chip-blue" style={{ padding: "3px 10px" }}>{CANDIDATE_TECH_LABEL[r.candidateTech]}</span>
                    <span className="chip chip-gray" style={{ padding: "3px 10px" }}>Regra {r.ruleId} · v{r.rulesVersion}</span>
                  </div>
                  <label className="row text-sm" style={{ gap: 6, cursor: "pointer" }}>
                    <input type="checkbox" checked={selectedIds.has(r.activityId)} onChange={() => toggle(r.activityId)} />
                    Incluir no recorte
                  </label>
                </div>
                <div>
                  <strong style={{ fontFamily: "var(--font-display)" }}>{r.activityLabel}</strong>
                  <p className="text-sm" style={{ marginTop: "var(--space-1)" }}>{r.proposedChange}</p>
                </div>
                <div className="grid-2 text-sm">
                  <div className="stack stack-1">
                    <span className="provenance">Baseado nas respostas</span>
                    <span>{r.supportingAnswers.join("; ") || "—"}</span>
                  </div>
                  <div className="stack stack-1">
                    <span className="provenance">Métrica para avaliação</span>
                    <span>{r.metric}</span>
                  </div>
                  {r.humanControl && (
                    <div className="stack stack-1">
                      <span className="provenance">Controle humano</span>
                      <span>{r.humanControl}</span>
                    </div>
                  )}
                  {r.dependencies.length > 0 && (
                    <div className="stack stack-1">
                      <span className="provenance">Dependências</span>
                      <span>{r.dependencies.join("; ")}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ),
      )}
    </div>
  );
}
