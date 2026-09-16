export const WIZARD_STEPS = ["company", "process", "board", "result"] as const;
export type WizardStep = (typeof WIZARD_STEPS)[number];

export const STEP_LABELS: Record<WizardStep, string> = {
  company: "Empresa",
  process: "Processo",
  board: "Atividades",
  result: "Resultado",
};

/** Barra de progresso visível (referência Pega). */
export function Progress({ current }: { current: WizardStep }) {
  const currentIndex = WIZARD_STEPS.indexOf(current);
  return (
    <div className="stack stack-2 no-print" aria-label="Progresso do mapa">
      <div className="progress">
        {WIZARD_STEPS.map((step, i) => (
          <div
            key={step}
            className={`step ${i < currentIndex ? "done" : ""} ${i === currentIndex ? "active" : ""}`}
          />
        ))}
      </div>
      <div className="row text-sm muted" style={{ justifyContent: "space-between" }}>
        {WIZARD_STEPS.map((step) => (
          <span key={step} style={{ fontWeight: step === current ? 600 : 400 }}>
            {STEP_LABELS[step]}
          </span>
        ))}
      </div>
    </div>
  );
}
