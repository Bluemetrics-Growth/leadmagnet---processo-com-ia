"use client";

import { useState } from "react";
import type { Diagnostic } from "@/lib/domain/schemas";
import type { EvaluationResult } from "@/lib/domain/recommendations";
import { diagnosticToMarkdown } from "@/lib/exports/markdown";
import { diagnosticToJson, downloadFile } from "@/lib/exports/json";
import { track } from "@/lib/analytics/events";
import { postBestEffort } from "@/lib/client/sync";

interface Props {
  diagnostic: Diagnostic;
  evaluation: EvaluationResult;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LeadCapture({ diagnostic, evaluation }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [company, setCompany] = useState(diagnostic.company.confirmed.name.value ?? "");
  const [allowContact, setAllowContact] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function exportMarkdown() {
    downloadFile(`mapa-${diagnostic.id}.md`, diagnosticToMarkdown(diagnostic, evaluation), "text/markdown");
    track("export_completed", { format: "markdown" });
  }
  function exportJson() {
    downloadFile(`mapa-${diagnostic.id}.json`, diagnosticToJson(diagnostic), "application/json");
    track("export_completed", { format: "json" });
  }
  function printPdf() {
    track("export_completed", { format: "print" });
    window.print();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !EMAIL_RE.test(email.trim()) || !company.trim()) {
      setError("Preencha nome, um e-mail válido e a empresa.");
      return;
    }
    // E-mail digitado não é identidade verificada; apenas normalizamos.
    const normalizedEmail = email.trim().toLowerCase();
    // O lead vai para o Supabase (best-effort; no-op se não configurado).
    // Não é guardado localmente — a integração comercial é feita no Supabase/HubSpot.
    postBestEffort(`/api/diagnostics/${diagnostic.id}/capture`, {
      diagnostic,
      lead: {
        name: name.trim(),
        email: normalizedEmail,
        role: role.trim(),
        company: company.trim(),
        allowContact,
      },
    });
    track("lead_capture_submitted", { allowContact });
    setSaved(true);
    exportMarkdown();
  }

  return (
    <div className="card stack stack-4">
      <div className="stack stack-2">
        <span className="eyebrow">Salvar e exportar</span>
        <h3 className="bm-h1">Baixe seu mapa</h3>
        <p className="bm-body-muted text-sm">
          O resultado completo já está disponível acima, sem cadastro. Para salvar e baixar, deixe seus dados.
          Não pedimos telefone e não enviamos e-mail neste momento.
        </p>
      </div>

      {!open && !saved && (
        <div className="row">
          <button className="btn btn-primary" onClick={() => setOpen(true)}>Salvar e baixar meu mapa</button>
          <button className="btn btn-ghost" onClick={exportJson}>Exportar JSON</button>
          <button className="btn btn-ghost" onClick={printPdf}>Versão para impressão</button>
        </div>
      )}

      {open && !saved && (
        <form className="stack stack-4" onSubmit={handleSubmit}>
          <div className="grid-2">
            <div className="field">
              <label htmlFor="l_name">Nome</label>
              <input id="l_name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="l_email">E-mail</label>
              <input id="l_email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@empresa.com.br" />
            </div>
            <div className="field">
              <label htmlFor="l_role">Cargo</label>
              <input id="l_role" value={role} onChange={(e) => setRole(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="l_company">Empresa</label>
              <input id="l_company" value={company} onChange={(e) => setCompany(e.target.value)} />
            </div>
          </div>
          <label className="row text-sm" style={{ gap: 8, cursor: "pointer" }}>
            <input type="checkbox" checked={allowContact} onChange={(e) => setAllowContact(e.target.checked)} />
            Aceito receber comunicações futuras da Bluemetrics (separado do download).
          </label>
          {error && <span className="err">{error}</span>}
          <div className="row">
            <button type="submit" className="btn btn-primary">Salvar e baixar meu mapa</button>
            <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>Cancelar</button>
          </div>
        </form>
      )}

      {saved && (
        <div className="stack stack-3">
          <span className="chip chip-green" style={{ alignSelf: "flex-start" }}>
            <span className="dot" style={{ background: "var(--bm-green)" }} />Mapa salvo neste navegador
          </span>
          <div className="row">
            <button className="btn btn-secondary" onClick={exportMarkdown}>Baixar Markdown</button>
            <button className="btn btn-secondary" onClick={exportJson}>Baixar JSON</button>
            <button className="btn btn-ghost" onClick={printPdf}>Versão para impressão (PDF)</button>
          </div>
        </div>
      )}
    </div>
  );
}
