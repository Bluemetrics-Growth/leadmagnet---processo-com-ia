"use client";

import { useMemo, useState } from "react";
import type { CompanyContext, Diagnostic, ProvenancedField } from "@/lib/domain/schemas";
import { track } from "@/lib/analytics/events";

interface Props {
  diagnostic: Diagnostic;
  update: (mutator: (d: Diagnostic) => Diagnostic) => void;
  goNext: () => void;
}

type FieldKey = keyof CompanyContext["confirmed"];

const FIELD_LABELS: Record<FieldKey, string> = {
  name: "Nome",
  domain: "Domínio",
  industry: "Setor",
  employeeRange: "Faixa de funcionários",
  location: "Localização principal",
  operationUnit: "Unidade / operação (opcional)",
};

const STATUS_BANNER: Partial<Record<CompanyContext["status"], string>> = {
  found: "Informações encontradas no Apollo. Confirme se correspondem à empresa e à operação que você deseja mapear.",
  partial: "Encontramos informações parciais. Confirme os campos disponíveis e complete o que faltar.",
  not_found: "Não encontramos essa empresa. Preencha manualmente para continuar.",
  provider_unavailable: "A consulta empresarial está indisponível agora. Você pode continuar manualmente.",
  rate_limited: "Muitas consultas em sequência. Continue manualmente por enquanto.",
  budget_exceeded: "Limite de consultas atingido. Siga com o preenchimento manual.",
  manual: "Preencha as informações da empresa para contextualizar o diagnóstico.",
  idle: "Preencha as informações da empresa para contextualizar o diagnóstico.",
};

export function CompanyStep({ diagnostic, update, goNext }: Props) {
  const company = diagnostic.company;
  const simulated = company.apolloSnapshot?.simulated ?? false;

  const [values, setValues] = useState<Record<FieldKey, string>>(() => ({
    name: company.confirmed.name.value ?? "",
    domain: company.confirmed.domain.value ?? "",
    industry: company.confirmed.industry.value ?? "",
    employeeRange: company.confirmed.employeeRange.value ?? "",
    location: company.confirmed.location.value ?? "",
    operationUnit: company.confirmed.operationUnit.value ?? "",
  }));

  const hasApolloData = company.status === "found" || company.status === "partial";
  const banner = STATUS_BANNER[company.status] ?? STATUS_BANNER.manual!;

  const provenanceOf = useMemo(() => {
    const map: Record<FieldKey, ProvenancedField> = company.confirmed;
    return (key: FieldKey) => map[key];
  }, [company.confirmed]);

  function setField(key: FieldKey, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function commit(confirmed: boolean) {
    const now = new Date().toISOString();
    update((d) => {
      const src = confirmed ? "confirmed" : "user";
      const buildField = (key: FieldKey): ProvenancedField => {
        const previous = d.company.confirmed[key];
        const changed = (previous.value ?? "") !== values[key];
        return {
          value: values[key] || null,
          source: changed ? src : previous.source === "apollo" && confirmed ? "confirmed" : previous.source,
          at: changed ? now : previous.at,
        };
      };
      return {
        ...d,
        company: {
          ...d.company,
          contextConfirmed: confirmed,
          confirmed: {
            name: buildField("name"),
            domain: buildField("domain"),
            industry: buildField("industry"),
            employeeRange: buildField("employeeRange"),
            location: buildField("location"),
            operationUnit: buildField("operationUnit"),
          },
        },
      };
    });
  }

  function handleConfirm() {
    commit(true);
    track("company_context_confirmed", { simulated });
    goNext();
  }

  function handleReject() {
    // "Não é esta empresa": descarta a associação do Apollo, mantém edição manual.
    setValues((v) => ({ ...v, name: "", industry: "", employeeRange: "", location: "", operationUnit: "" }));
    update((d) => ({
      ...d,
      company: { ...d.company, status: "manual", apolloSnapshot: null, contextConfirmed: false },
    }));
    track("company_context_corrected", { action: "rejected" });
  }

  function handleSkip() {
    commit(false);
    track("company_lookup_skipped");
    goNext();
  }

  return (
    <div className="stack stack-5">
      <div className="stack stack-2">
        <h2 className="bm-display-m">Confirme a empresa</h2>
        <p className="bm-body-muted">{banner}</p>
        {simulated && (
          <div className="chip chip-orange" style={{ alignSelf: "flex-start" }}>
            <span className="dot" style={{ background: "var(--bm-orange)" }} />
            Dados simulados (ambiente de desenvolvimento) — não representam uma empresa real
          </div>
        )}
      </div>

      <div className="card stack stack-4">
        <div className="grid-2">
          {(Object.keys(FIELD_LABELS) as FieldKey[]).map((key) => {
            const prov = provenanceOf(key);
            return (
              <div key={key} className="field">
                <label htmlFor={`f_${key}`}>{FIELD_LABELS[key]}</label>
                <input
                  id={`f_${key}`}
                  type="text"
                  value={values[key]}
                  onChange={(e) => setField(key, e.target.value)}
                  placeholder={key === "domain" ? "empresa.com.br" : "—"}
                />
                <span className="provenance">
                  Origem: {prov.source === "apollo" ? "Apollo" : prov.source === "confirmed" ? "confirmado" : "você"}
                  {prov.value ? ` · ${new Date(prov.at).toLocaleDateString("pt-BR")}` : ""}
                </span>
              </div>
            );
          })}
        </div>
        {hasApolloData && (
          <p className="hint">
            Se o resultado corresponde ao grupo empresarial, informe a unidade ou operação relevante. Não
            assumimos que o porte do grupo representa a unidade.
          </p>
        )}
      </div>

      <div className="row">
        <button className="btn btn-primary" onClick={handleConfirm}>
          Confirmar e continuar
        </button>
        {hasApolloData && (
          <button className="btn btn-secondary" onClick={handleReject}>
            Não é esta empresa
          </button>
        )}
        <button className="btn btn-ghost" onClick={handleSkip}>
          Continuar sem esses dados
        </button>
      </div>
    </div>
  );
}
