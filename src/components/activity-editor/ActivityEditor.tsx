"use client";

import type { AccessMethod, Activity, ActivityKind, ErrorImpact, PainSignal } from "@/lib/domain/schemas";
import { ACCESS_METHOD_LABELS, ERROR_IMPACT_LABELS, KIND_LABELS, PAIN_SIGNAL_LABELS } from "@/lib/domain/labels";
import { AnswerToggle } from "./AnswerToggle";

interface Props {
  activity: Activity;
  onChange: (activity: Activity) => void;
  onClose: () => void;
}

const KINDS = Object.keys(KIND_LABELS) as ActivityKind[];
const PAIN_SIGNALS = Object.keys(PAIN_SIGNAL_LABELS) as PainSignal[];

export function ActivityEditor({ activity, onChange, onClose }: Props) {
  function set<K extends keyof Activity>(key: K, value: Activity[K]) {
    onChange({ ...activity, [key]: value });
  }

  function togglePain(signal: PainSignal) {
    const has = activity.painSignals.includes(signal);
    set("painSignals", has ? activity.painSignals.filter((s) => s !== signal) : [...activity.painSignals, signal]);
  }

  return (
    <aside className="card stack stack-4" aria-label={`Editar ${activity.label}`}>
      <div className="row row-between">
        <span className="eyebrow">Editar atividade</span>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>
          Fechar
        </button>
      </div>

      <div className="field">
        <label htmlFor="a_label">Nome da atividade</label>
        <input id="a_label" value={activity.label} onChange={(e) => set("label", e.target.value)} />
      </div>

      <div className="grid-2">
        <div className="field">
          <label htmlFor="a_kind">Tipo</label>
          <select id="a_kind" value={activity.kind} onChange={(e) => set("kind", e.target.value as ActivityKind)}>
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {KIND_LABELS[k]}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="a_role">Responsável</label>
          <input
            id="a_role"
            value={activity.responsibleRole ?? ""}
            onChange={(e) => set("responsibleRole", e.target.value || null)}
            placeholder="Ex.: Analista"
          />
        </div>
      </div>

      <hr className="divider" />
      <span className="eyebrow">Características (respondemos só o necessário)</span>

      <AnswerToggle label="A entrada é estruturada?" value={activity.structuredInput} onChange={(v) => set("structuredInput", v)} />
      <AnswerToggle label="Existem critérios objetivos?" value={activity.objectiveRules} onChange={(v) => set("objectiveRules", v)} />
      <AnswerToggle
        label="É necessário interpretar texto, imagem ou conversa?"
        value={activity.interpretationRequired}
        onChange={(v) => set("interpretationRequired", v)}
      />
      <AnswerToggle label="A atividade é repetitiva?" value={activity.repetitive} onChange={(v) => set("repetitive", v)} />
      <AnswerToggle
        label="Há aprovação humana obrigatória?"
        value={activity.mandatoryHumanApproval}
        onChange={(v) => set("mandatoryHumanApproval", v)}
      />

      <div className="grid-2">
        <div className="field">
          <label htmlFor="a_access">Como os dados podem ser acessados?</label>
          <select
            id="a_access"
            value={activity.accessMethod}
            onChange={(e) => set("accessMethod", e.target.value as AccessMethod)}
          >
            {(Object.keys(ACCESS_METHOD_LABELS) as AccessMethod[]).map((m) => (
              <option key={m} value={m}>
                {ACCESS_METHOD_LABELS[m]}
              </option>
            ))}
          </select>
          <span className="hint">API declarada = informação sua, não integração validada.</span>
        </div>
        <div className="field">
          <label htmlFor="a_impact">Qual o impacto de um erro?</label>
          <select
            id="a_impact"
            value={activity.errorImpact}
            onChange={(e) => set("errorImpact", e.target.value as ErrorImpact)}
          >
            {(Object.keys(ERROR_IMPACT_LABELS) as ErrorImpact[]).map((m) => (
              <option key={m} value={m}>
                {ERROR_IMPACT_LABELS[m]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="field">
        <label>Onde ocorre espera, retrabalho ou inconsistência?</label>
        <div className="row" style={{ gap: "var(--space-2)" }}>
          {PAIN_SIGNALS.map((s) => (
            <button
              key={s}
              type="button"
              className={`chip ${activity.painSignals.includes(s) ? "chip-orange" : "chip-gray"}`}
              style={{ cursor: "pointer", border: "none" }}
              aria-pressed={activity.painSignals.includes(s)}
              onClick={() => togglePain(s)}
            >
              {PAIN_SIGNAL_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label htmlFor="a_notes">Notas</label>
        <textarea
          id="a_notes"
          rows={2}
          value={activity.notes ?? ""}
          onChange={(e) => set("notes", e.target.value || null)}
          placeholder="Contexto livre — não interpretado automaticamente."
        />
      </div>
    </aside>
  );
}
