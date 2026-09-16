"use client";

import { useState } from "react";
import type { Diagnostic } from "@/lib/domain/schemas";
import { makeId } from "@/lib/id";
import { saveContactRequest } from "@/lib/persistence/store";
import { track } from "@/lib/analytics/events";
import { PRODUCT } from "@/config/product";

export function ContactRequest({ diagnostic }: { diagnostic: Diagnostic }) {
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState(diagnostic.scope?.objective ?? "");
  const [hasOwner, setHasOwner] = useState(false);
  const [timeline, setTimeline] = useState("");
  const [budget, setBudget] = useState("");
  const [sent, setSent] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Idempotência simples por diagnóstico + recorte (seção 18).
    saveContactRequest({
      id: makeId("req"),
      diagnosticId: diagnostic.id,
      scope: scope.trim(),
      hasProcessOwner: hasOwner,
      timeline: timeline.trim(),
      budgetInDiscussion: budget.trim() || null,
      createdAt: new Date().toISOString(),
    });
    track("contact_request_submitted", { hasOwner });
    setSent(true);
  }

  return (
    <div className="card stack stack-4" style={{ borderColor: "var(--bm-blue)" }}>
      <div className="stack stack-2">
        <span className="eyebrow">Avaliação com a Bluemetrics</span>
        <h3 className="bm-h1">Quero avaliar este recorte com a Bluemetrics</h3>
        <p className="bm-body-muted text-sm">
          Registramos sua solicitação de contato. Um clique em agenda não representa reunião realizada.
        </p>
      </div>

      {!open && !sent && (
        <button className="btn btn-primary" style={{ alignSelf: "flex-start" }} onClick={() => setOpen(true)}>
          Quero avaliar este recorte com a Bluemetrics
        </button>
      )}

      {open && !sent && (
        <form className="stack stack-4" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="c_scope">Qual recorte deseja discutir?</label>
            <textarea id="c_scope" rows={2} value={scope} onChange={(e) => setScope(e.target.value)} />
          </div>
          <label className="row text-sm" style={{ gap: 8, cursor: "pointer" }}>
            <input type="checkbox" checked={hasOwner} onChange={(e) => setHasOwner(e.target.checked)} />
            Existe um responsável pelo processo.
          </label>
          <div className="grid-2">
            <div className="field">
              <label htmlFor="c_timeline">Quando pretende avaliar a implementação?</label>
              <input id="c_timeline" value={timeline} onChange={(e) => setTimeline(e.target.value)} placeholder="Ex.: próximo trimestre" />
            </div>
            <div className="field">
              <label htmlFor="c_budget">Há orçamento em discussão? (opcional)</label>
              <input id="c_budget" value={budget} onChange={(e) => setBudget(e.target.value)} />
            </div>
          </div>
          <div className="row">
            <button type="submit" className="btn btn-primary">Enviar solicitação</button>
            <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>Cancelar</button>
          </div>
        </form>
      )}

      {sent && (
        <div className="stack stack-3">
          <span className="chip chip-green" style={{ alignSelf: "flex-start" }}>
            <span className="dot" style={{ background: "var(--bm-green)" }} />Solicitação registrada
          </span>
          {PRODUCT.bookingUrl && (
            <a className="btn btn-secondary" href={PRODUCT.bookingUrl} target="_blank" rel="noreferrer" style={{ alignSelf: "flex-start" }}>
              Abrir agenda da Bluemetrics
            </a>
          )}
        </div>
      )}
    </div>
  );
}
