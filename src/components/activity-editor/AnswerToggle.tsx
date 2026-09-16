"use client";

import type { Answer } from "@/lib/domain/schemas";

const OPTIONS: { value: Answer; label: string }[] = [
  { value: "yes", label: "Sim" },
  { value: "no", label: "Não" },
  { value: "unknown", label: "Não sei" },
];

export function AnswerToggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Answer;
  onChange: (v: Answer) => void;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      <div className="row" style={{ gap: "var(--space-2)" }} role="group" aria-label={label}>
        {OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            className={`chip ${value === o.value ? "chip-blue" : "chip-gray"}`}
            style={{ cursor: "pointer", border: "none" }}
            aria-pressed={value === o.value}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
