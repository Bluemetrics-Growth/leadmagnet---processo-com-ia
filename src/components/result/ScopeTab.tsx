"use client";

import { useState } from "react";
import type { Diagnostic } from "@/lib/domain/schemas";
import type { SuggestedScope } from "@/lib/domain/recommendations";
import { track } from "@/lib/analytics/events";

interface Props {
  diagnostic: Diagnostic;
  update: (mutator: (d: Diagnostic) => Diagnostic) => void;
  suggestedScope: SuggestedScope;
  selectedIds: Set<string>;
  toggle: (activityId: string) => void;
}

export function ScopeTab({ diagnostic, update, suggestedScope, selectedIds, toggle }: Props) {
  const [objective, setObjective] = useState(diagnostic.scope?.objective ?? "");
  const activities = diagnostic.current.activities;
  const included = activities.filter((a) => selectedIds.has(a.id));
  const outOfScope = activities.filter((a) => !selectedIds.has(a.id));

  function save() {
    update((d) => ({
      ...d,
      scope: {
        objective: objective.trim(),
        activityIds: Array.from(selectedIds),
        outOfScope: outOfScope.map((a) => a.id),
      },
    }));
    track("scope_selected", { activities: included.length, discovery: suggestedScope.isDiscovery });
  }

  return (
    <div className="stack stack-5">
      <div className="card-stage stack stack-2">
        <span className="eyebrow">Sugestão do motor</span>
        <p className="text-sm">{suggestedScope.reason}</p>
        {suggestedScope.isDiscovery && (
          <span className="chip chip-orange" style={{ alignSelf: "flex-start" }}>Recorte de descoberta recomendado</span>
        )}
      </div>

      <div className="field">
        <label htmlFor="scope_obj">Objetivo do recorte</label>
        <textarea
          id="scope_obj"
          rows={2}
          value={objective}
          onChange={(e) => setObjective(e.target.value)}
          onBlur={save}
          placeholder="Ex.: Reduzir o tempo de triagem mantendo a decisão humana."
        />
      </div>

      <div className="grid-2">
        <div className="card stack stack-3">
          <span className="eyebrow">Atividades incluídas ({included.length})</span>
          {included.length === 0 && <p className="muted text-sm">Marque oportunidades para compor o recorte.</p>}
          {included.map((a) => (
            <div key={a.id} className="row row-between">
              <span className="text-sm">{a.label}</span>
              <button className="btn btn-danger-ghost btn-sm" onClick={() => { toggle(a.id); }}>remover</button>
            </div>
          ))}
        </div>
        <div className="card-stage stack stack-3">
          <span className="eyebrow">Fora do escopo ({outOfScope.length})</span>
          {outOfScope.map((a) => (
            <div key={a.id} className="row row-between">
              <span className="text-sm muted">{a.label}</span>
              <button className="btn btn-ghost btn-sm" onClick={() => { toggle(a.id); }}>incluir</button>
            </div>
          ))}
        </div>
      </div>

      <button className="btn btn-secondary" style={{ alignSelf: "flex-start" }} onClick={save}>
        Salvar recorte
      </button>
    </div>
  );
}
