"use client";

import { useEffect, useState } from "react";
import { Nav } from "@/components/brand/Nav";
import {
  listContactRequests,
  listDiagnostics,
  listLeads,
  type ContactRequest,
  type Lead,
} from "@/lib/persistence/store";
import type { Diagnostic } from "@/lib/domain/schemas";
import { downloadFile } from "@/lib/exports/json";

/* Área interna simples (seção 16). No MVP lê os dados locais deste navegador;
   em produção usa Supabase Auth + autorização no servidor. Sem ações de
   prospecção no Apollo. */

function toCsv(rows: Record<string, string | number | boolean>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => `"${String(v ?? "").replaceAll('"', '""')}"`;
  return [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
}

export default function AdminPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [requests, setRequests] = useState<ContactRequest[]>([]);
  const [diagnostics, setDiagnostics] = useState<Diagnostic[]>([]);

  useEffect(() => {
    setLeads(listLeads());
    setRequests(listContactRequests());
    setDiagnostics(listDiagnostics());
  }, []);

  function exportLeadsCsv() {
    const rows = leads.map((l) => ({
      nome: l.name,
      email: l.email,
      cargo: l.role,
      empresa: l.company,
      diagnostico: l.diagnosticId,
      aceita_contato: l.allowContact,
      criado_em: l.createdAt,
    }));
    downloadFile("leads.csv", toCsv(rows), "text/csv");
  }

  return (
    <>
      <Nav>
        <a className="btn btn-ghost btn-sm" href="/">Início</a>
      </Nav>
      <main className="bm-container" style={{ paddingBlock: "var(--space-7)" }}>
        <div className="stack stack-6">
          <div className="stack stack-2">
            <span className="eyebrow">Área interna</span>
            <h1 className="bm-display-m">Leads, pedidos e diagnósticos</h1>
            <p className="bm-body-muted text-sm">
              Visão local deste navegador (MVP). Em produção, autorização é definida no servidor via Supabase
              Auth. Não há ações de prospecção no Apollo.
            </p>
          </div>

          <section className="card stack stack-4">
            <div className="row row-between">
              <h3 className="bm-h1">Leads ({leads.length})</h3>
              <button className="btn btn-secondary btn-sm" onClick={exportLeadsCsv} disabled={leads.length === 0}>
                Exportar CSV
              </button>
            </div>
            <Table
              headers={["Nome", "E-mail", "Cargo", "Empresa", "Contato?", "Data"]}
              rows={leads.map((l) => [l.name, l.email, l.role, l.company, l.allowContact ? "sim" : "não", new Date(l.createdAt).toLocaleString("pt-BR")])}
            />
          </section>

          <section className="card stack stack-4">
            <h3 className="bm-h1">Solicitações de avaliação ({requests.length})</h3>
            <Table
              headers={["Diagnóstico", "Recorte", "Responsável", "Prazo", "Orçamento", "Data"]}
              rows={requests.map((r) => [r.diagnosticId, r.scope || "—", r.hasProcessOwner ? "sim" : "não", r.timeline || "—", r.budgetInDiscussion ?? "—", new Date(r.createdAt).toLocaleString("pt-BR")])}
            />
          </section>

          <section className="card stack stack-4">
            <h3 className="bm-h1">Diagnósticos ({diagnostics.length})</h3>
            <Table
              headers={["ID", "Empresa", "Origem dados", "Processo", "Estado", "Atualizado"]}
              rows={diagnostics.map((d) => [
                d.id,
                d.company.confirmed.name.value ?? "—",
                d.company.confirmed.name.source,
                d.process?.name ?? "—",
                d.status === "confirmed" ? "confirmado" : "preliminar",
                new Date(d.updatedAt).toLocaleString("pt-BR"),
              ])}
            />
          </section>
        </div>
      </main>
    </>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: (string | number)[][] }) {
  if (rows.length === 0) return <p className="muted text-sm">Nenhum registro.</p>;
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--fs-body-sm)" }}>
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h} style={{ textAlign: "left", padding: "8px 12px", borderBottom: "1px solid var(--border)", color: "var(--fg-2)", fontWeight: 600 }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j} style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)" }}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
