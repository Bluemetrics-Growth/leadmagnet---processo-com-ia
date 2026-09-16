/** Prévia ilustrativa do quadro de fases — claramente marcada como exemplo. */
export function PreviewBoard() {
  const phases = [
    { name: "Entrada", acts: ["Receber documento", "Verificar completude"] },
    { name: "Análise", acts: ["Identificar informações", "Consultar critérios"] },
    { name: "Decisão", acts: ["Revisar", "Registrar decisão"] },
  ];
  return (
    <div className="card" style={{ background: "var(--neutral-50)" }} aria-hidden="true">
      <div className="row row-between" style={{ marginBottom: "var(--space-4)" }}>
        <span className="eyebrow">Exemplo ilustrativo</span>
        <span className="chip chip-gray">Prévia</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--space-3)" }}>
        {phases.map((p) => (
          <div key={p.name} className="stack stack-2">
            <div className="text-sm" style={{ fontWeight: 600, color: "var(--fg-2)" }}>
              {p.name}
            </div>
            {p.acts.map((a) => (
              <div
                key={a}
                className="card"
                style={{ padding: "var(--space-3)", fontSize: "var(--fs-body-sm)", boxShadow: "none" }}
              >
                {a}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="row" style={{ marginTop: "var(--space-4)", gap: "var(--space-2)" }}>
        <span className="chip chip-blue">IA</span>
        <span className="chip chip-cyan">Regra</span>
        <span className="chip chip-purple">Integração</span>
        <span className="chip chip-gray">Pessoa</span>
      </div>
    </div>
  );
}
