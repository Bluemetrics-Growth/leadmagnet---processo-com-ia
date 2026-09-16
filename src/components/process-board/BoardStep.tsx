"use client";

import { useState } from "react";
import type { Activity, Diagnostic, ProcessGraph } from "@/lib/domain/schemas";
import {
  addActivity,
  addConnection,
  addPhase,
  moveActivity,
  moveActivityToPhase,
  phaseActivities,
  removeActivity,
  removeConnection,
  removePhase,
  renamePhase,
  updateActivity,
  validateStructure,
} from "@/lib/domain/graph-ops";
import { KIND_LABELS } from "@/lib/domain/labels";
import { ActivityEditor } from "@/components/activity-editor/ActivityEditor";
import { ProcessGraphView } from "@/components/process-graph/ProcessGraph";
import { track } from "@/lib/analytics/events";

interface Props {
  diagnostic: Diagnostic;
  update: (mutator: (d: Diagnostic) => Diagnostic) => void;
  goNext: () => void;
  goBack: () => void;
}

export function BoardStep({ diagnostic, update, goNext, goBack }: Props) {
  const [graph, setGraph] = useState<ProcessGraph>(diagnostic.current);
  const [history, setHistory] = useState<ProcessGraph[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<"board" | "flow">("board");
  const [showConnections, setShowConnections] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  function commit(next: ProcessGraph) {
    setHistory((h) => [...h, graph].slice(-50));
    setGraph(next);
    update((d) => ({ ...d, current: next, currentConfirmed: false }));
  }

  function undo() {
    setHistory((h) => {
      if (h.length === 0) return h;
      const prev = h[h.length - 1];
      setGraph(prev);
      update((d) => ({ ...d, current: prev }));
      return h.slice(0, -1);
    });
  }

  const selected = selectedId ? graph.activities.find((a) => a.id === selectedId) ?? null : null;

  function onActivityChange(activity: Activity) {
    commit(updateActivity(graph, activity));
  }

  function handleConfirm() {
    const validation = validateStructure(graph);
    if (!validation.ok) {
      setErrors(validation.errors);
      return;
    }
    const confirmedGraph: ProcessGraph = {
      ...graph,
      activities: graph.activities.map((a) => ({ ...a, presenceConfirmed: true })),
    };
    update((d) => ({
      ...d,
      current: confirmedGraph,
      currentConfirmed: true,
      status: "confirmed",
    }));
    track("current_process_confirmed", { activities: confirmedGraph.activities.length });
    goNext();
  }

  const phases = [...graph.phases].sort((a, b) => a.order - b.order);

  return (
    <div className="stack stack-5">
      <div className="row row-between">
        <div className="stack stack-2">
          <h2 className="bm-display-m">Seu processo atual</h2>
          <p className="bm-body-muted">
            Atividades do modelo entram como sugestões. Renomeie, adicione, remova, reordene e informe as
            características. Confirmar valida presença e ordem, não o acesso aos sistemas.
          </p>
        </div>
        <div className="row no-print">
          <button className="btn btn-tertiary btn-sm" onClick={undo} disabled={history.length === 0}>
            Desfazer
          </button>
          <div className="row" style={{ gap: 0, border: "1px solid var(--border)", borderRadius: "var(--radius-pill)", overflow: "hidden" }}>
            <button
              className={`btn btn-sm ${view === "board" ? "btn-primary" : "btn-ghost"}`}
              style={{ borderRadius: 0, boxShadow: "none" }}
              onClick={() => setView("board")}
            >
              Quadro
            </button>
            <button
              className={`btn btn-sm ${view === "flow" ? "btn-primary" : "btn-ghost"}`}
              style={{ borderRadius: 0, boxShadow: "none" }}
              onClick={() => setView("flow")}
            >
              Fluxo
            </button>
          </div>
        </div>
      </div>

      {view === "flow" ? (
        <div className="card">
          <ProcessGraphView graph={graph} />
        </div>
      ) : (
        <div className="stack stack-4">
          <div
            style={{
              display: "grid",
              gap: "var(--space-4)",
              gridTemplateColumns: `repeat(${Math.max(phases.length, 1)}, minmax(220px, 1fr))`,
              overflowX: "auto",
            }}
            className="board-scroll"
          >
            {phases.map((phase) => {
              const acts = phaseActivities(graph, phase.id);
              return (
                <div key={phase.id} className="card-stage stack stack-3">
                  <div className="row row-between">
                    <input
                      value={phase.label}
                      onChange={(e) => commit(renamePhase(graph, phase.id, e.target.value))}
                      aria-label="Nome da fase"
                      style={{
                        fontWeight: 600,
                        fontFamily: "var(--font-display)",
                        border: "none",
                        background: "transparent",
                        width: "70%",
                        padding: 0,
                        fontSize: "var(--fs-h4)",
                      }}
                    />
                    <button
                      className="btn btn-danger-ghost btn-sm"
                      onClick={() => commit(removePhase(graph, phase.id))}
                      title="Remover fase"
                      aria-label={`Remover fase ${phase.label}`}
                    >
                      ×
                    </button>
                  </div>

                  {acts.map((a) => (
                    <div
                      key={a.id}
                      className={`card ${selectedId === a.id ? "card-selected" : ""}`}
                      style={{ padding: "var(--space-3)", cursor: "pointer" }}
                      onClick={() => setSelectedId(a.id)}
                    >
                      <div className="row row-between">
                        <span style={{ fontWeight: 500, fontSize: "var(--fs-body-sm)" }}>{a.label}</span>
                        <span className="chip chip-gray" style={{ padding: "2px 8px" }}>
                          {KIND_LABELS[a.kind]}
                        </span>
                      </div>
                      {a.responsibleRole && <div className="provenance">{a.responsibleRole}</div>}
                      <div className="row no-print" style={{ gap: 4, marginTop: 6 }}>
                        <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); commit(moveActivity(graph, a.id, -1)); }} aria-label="Mover para cima">↑</button>
                        <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); commit(moveActivity(graph, a.id, 1)); }} aria-label="Mover para baixo">↓</button>
                        <select
                          className="text-sm"
                          value={a.phaseId}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => { commit(moveActivityToPhase(graph, a.id, e.target.value)); }}
                          aria-label="Mover para fase"
                          style={{ padding: "2px 6px", borderRadius: "var(--radius-s)", border: "1px solid var(--border)" }}
                        >
                          {phases.map((p) => (
                            <option key={p.id} value={p.id}>{p.label}</option>
                          ))}
                        </select>
                        <button className="btn btn-danger-ghost btn-sm" onClick={(e) => { e.stopPropagation(); commit(removeActivity(graph, a.id)); if (selectedId === a.id) setSelectedId(null); }} aria-label="Remover atividade">Remover</button>
                      </div>
                    </div>
                  ))}

                  <button className="btn btn-ghost btn-sm" onClick={() => commit(addActivity(graph, phase.id))}>
                    + Atividade
                  </button>
                </div>
              );
            })}
          </div>

          <div className="row no-print">
            <button className="btn btn-tertiary btn-sm" onClick={() => commit(addPhase(graph))}>
              + Fase
            </button>
            <button className="btn btn-tertiary btn-sm" onClick={() => setShowConnections((s) => !s)}>
              {showConnections ? "Ocultar caminhos e decisões" : "Caminhos, decisões e retornos"}
            </button>
          </div>

          {showConnections && <ConnectionsEditor graph={graph} commit={commit} />}
        </div>
      )}

      {selected && (
        <ActivityEditor activity={selected} onChange={onActivityChange} onClose={() => setSelectedId(null)} />
      )}

      {errors.length > 0 && (
        <div className="card" style={{ borderColor: "var(--danger)" }}>
          <span className="eyebrow" style={{ color: "var(--danger)" }}>Ajustes necessários</span>
          <ul className="stack stack-2 text-sm" style={{ margin: "var(--space-2) 0 0", paddingLeft: "var(--space-5)" }}>
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="row row-between">
        <button className="btn btn-ghost" onClick={() => { update((d) => ({ ...d, current: graph })); goBack(); }}>
          ‹ Voltar
        </button>
        <button className="btn btn-primary" onClick={handleConfirm}>
          Confirmar estrutura e ver resultado
        </button>
      </div>
    </div>
  );
}

function ConnectionsEditor({
  graph,
  commit,
}: {
  graph: ProcessGraph;
  commit: (g: ProcessGraph) => void;
}) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [type, setType] = useState<"sequence" | "decision" | "return">("decision");
  const [condition, setCondition] = useState("");

  const label = (id: string) => graph.activities.find((a) => a.id === id)?.label ?? id;

  function add() {
    if (!from || !to || from === to) return;
    commit(addConnection(graph, { from, to, type, condition: condition.trim() || null }));
    setCondition("");
  }

  return (
    <div className="card stack stack-3">
      <span className="eyebrow">Caminhos alternativos e retornos</span>
      <div className="grid-2">
        <div className="field">
          <label>De</label>
          <select value={from} onChange={(e) => setFrom(e.target.value)}>
            <option value="">Selecione</option>
            {graph.activities.map((a) => (
              <option key={a.id} value={a.id}>{a.label}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Para</label>
          <select value={to} onChange={(e) => setTo(e.target.value)}>
            <option value="">Selecione</option>
            {graph.activities.map((a) => (
              <option key={a.id} value={a.id}>{a.label}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid-2">
        <div className="field">
          <label>Tipo</label>
          <select value={type} onChange={(e) => setType(e.target.value as typeof type)}>
            <option value="sequence">Sequência</option>
            <option value="decision">Decisão</option>
            <option value="return">Retorno</option>
          </select>
        </div>
        <div className="field">
          <label>Condição (opcional)</label>
          <input value={condition} onChange={(e) => setCondition(e.target.value)} placeholder="Ex.: se incompleto" />
        </div>
      </div>
      <button className="btn btn-secondary btn-sm" onClick={add} style={{ alignSelf: "flex-start" }}>
        Adicionar caminho
      </button>

      {graph.connections.length > 0 && (
        <ul className="stack stack-2 text-sm" style={{ margin: 0, padding: 0, listStyle: "none" }}>
          {graph.connections.map((c) => (
            <li key={c.id} className="row row-between">
              <span>
                {label(c.from)} → {label(c.to)}{" "}
                <span className="muted">
                  ({c.type}
                  {c.condition ? `: ${c.condition}` : ""})
                </span>
              </span>
              <button className="btn btn-danger-ghost btn-sm" onClick={() => commit(removeConnection(graph, c.id))}>
                remover
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
