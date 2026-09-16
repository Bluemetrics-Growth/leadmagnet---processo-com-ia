"use client";

import { useState } from "react";
import type { Diagnostic, ProcessProblem } from "@/lib/domain/schemas";
import { PROCESS_TEMPLATES } from "@/config/process-templates";
import { instantiateTemplate } from "@/lib/templates";
import { PROBLEM_LABELS } from "@/lib/domain/labels";
import { track } from "@/lib/analytics/events";

interface Props {
  diagnostic: Diagnostic;
  update: (mutator: (d: Diagnostic) => Diagnostic) => void;
  goNext: () => void;
  goBack: () => void;
}

const PROBLEMS: ProcessProblem[] = [
  "manual_work",
  "waiting",
  "rework",
  "inconsistency",
  "volume",
  "traceability",
  "still_exploring",
];

export function ProcessStep({ diagnostic, update, goNext, goBack }: Props) {
  const [templateId, setTemplateId] = useState(diagnostic.process?.templateId ?? "");
  const [name, setName] = useState(diagnostic.process?.name ?? "");
  const [trigger, setTrigger] = useState(diagnostic.process?.trigger ?? "");
  const [completion, setCompletion] = useState(diagnostic.process?.completion ?? "");
  const [mainProblem, setMainProblem] = useState<ProcessProblem | "">(diagnostic.process?.mainProblem ?? "");
  const [area, setArea] = useState(diagnostic.process?.area ?? "");
  const [extra, setExtra] = useState(diagnostic.process?.extraContext ?? "");
  const [showErrors, setShowErrors] = useState(false);

  const valid = templateId && name.trim() && trigger.trim() && completion.trim() && mainProblem;

  function handleContinue() {
    if (!valid) {
      setShowErrors(true);
      return;
    }
    update((d) => {
      // Reinstancia a estrutura somente se o modelo mudou (preserva edições).
      const templateChanged = d.process?.templateId !== templateId;
      const current = templateChanged ? instantiateTemplate(templateId) : d.current;
      return {
        ...d,
        process: {
          templateId,
          name: name.trim(),
          trigger: trigger.trim(),
          completion: completion.trim(),
          mainProblem: mainProblem as ProcessProblem,
          area: area.trim() || null,
          extraContext: extra.trim() || null,
        },
        current,
        currentConfirmed: templateChanged ? false : d.currentConfirmed,
      };
    });
    track("template_selected", { template: templateId });
    track("diagnostic_started");
    goNext();
  }

  return (
    <div className="stack stack-6">
      <div className="stack stack-2">
        <h2 className="bm-display-m">Que tipo de processo você quer mapear?</h2>
        <p className="bm-body-muted">
          Escolha um modelo como ponto de partida. As atividades entram como sugestões e você poderá editar
          tudo em seguida.
        </p>
      </div>

      <div className="grid-auto">
        {PROCESS_TEMPLATES.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`card card-selectable stack stack-2 ${templateId === t.id ? "card-selected" : ""}`}
            style={{ textAlign: "left", alignItems: "flex-start" }}
            onClick={() => setTemplateId(t.id)}
            aria-pressed={templateId === t.id}
          >
            <span className="eyebrow">{t.id === "custom" ? "Personalizado" : "Modelo"}</span>
            <span style={{ fontFamily: "var(--font-display)", fontSize: "var(--fs-h3)", fontWeight: 600 }}>
              {t.title}
            </span>
            <span className="text-sm muted">{t.description}</span>
          </button>
        ))}
      </div>
      {showErrors && !templateId && <span className="err">Escolha um modelo de processo.</span>}

      <hr className="divider" />

      <div className="stack stack-4">
        <div className="grid-2">
          <div className="field">
            <label htmlFor="p_name">Nome do processo *</label>
            <input id="p_name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Análise de contratos" />
            {showErrors && !name.trim() && <span className="err">Campo obrigatório.</span>}
          </div>
          <div className="field">
            <label htmlFor="p_area">Área responsável</label>
            <input id="p_area" value={area} onChange={(e) => setArea(e.target.value)} placeholder="Opcional" />
          </div>
        </div>

        <div className="grid-2">
          <div className="field">
            <label htmlFor="p_trigger">O que inicia o processo? *</label>
            <input id="p_trigger" value={trigger} onChange={(e) => setTrigger(e.target.value)} placeholder="Ex.: Chegada de um documento" />
            {showErrors && !trigger.trim() && <span className="err">Campo obrigatório.</span>}
          </div>
          <div className="field">
            <label htmlFor="p_completion">Quando ele está concluído? *</label>
            <input id="p_completion" value={completion} onChange={(e) => setCompletion(e.target.value)} placeholder="Ex.: Decisão registrada" />
            {showErrors && !completion.trim() && <span className="err">Campo obrigatório.</span>}
          </div>
        </div>

        <div className="field">
          <label>Principal problema *</label>
          <div className="row" style={{ gap: "var(--space-2)" }}>
            {PROBLEMS.map((p) => (
              <button
                key={p}
                type="button"
                className={`chip ${mainProblem === p ? "chip-blue" : "chip-gray"}`}
                style={{ cursor: "pointer", border: "none" }}
                onClick={() => setMainProblem(p)}
                aria-pressed={mainProblem === p}
              >
                {PROBLEM_LABELS[p]}
              </button>
            ))}
          </div>
          {showErrors && !mainProblem && <span className="err">Selecione o principal problema.</span>}
        </div>

        <div className="field">
          <label htmlFor="p_extra">Contexto adicional</label>
          <textarea
            id="p_extra"
            rows={3}
            value={extra}
            onChange={(e) => setExtra(e.target.value)}
            placeholder="Opcional. Campos livres não são interpretados automaticamente no MVP."
          />
        </div>
      </div>

      <div className="row row-between">
        <button className="btn btn-ghost" onClick={goBack}>
          ‹ Voltar
        </button>
        <button className="btn btn-primary" onClick={handleContinue}>
          Continuar
        </button>
      </div>
    </div>
  );
}
