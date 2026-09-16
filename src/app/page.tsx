"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Nav } from "@/components/brand/Nav";
import { PreviewBoard } from "@/components/landing/PreviewBoard";
import { createDiagnostic, emptyCompanyContext, applySnapshot } from "@/lib/domain/factory";
import { saveDiagnostic } from "@/lib/persistence/store";
import { track } from "@/lib/analytics/events";
import type { CompanyLookupStatus, CompanySnapshot } from "@/lib/domain/schemas";

type LookupResponse = {
  status: CompanyLookupStatus;
  domain: string | null;
  snapshot: CompanySnapshot | null;
  simulated: boolean;
  message?: string;
  reason?: string;
};

export default function LandingPage() {
  const router = useRouter();
  const [site, setSite] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    track("landing_viewed");
  }, []);

  function goToDiagnostic(company: ReturnType<typeof emptyCompanyContext>) {
    const diagnostic = createDiagnostic(company);
    saveDiagnostic(diagnostic);
    router.push(`/mapa/${diagnostic.id}?step=company`);
  }

  async function handleStart(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!site.trim()) {
      setError("Informe o site da sua empresa ou continue sem o site.");
      return;
    }
    setLoading(true);
    track("company_lookup_submitted");

    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await fetch("/api/company-lookup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ site: site.trim() }),
        signal: controller.signal,
      });
      const data = (await res.json()) as LookupResponse;

      if (res.status === 422) {
        track("company_lookup_failed", { reason: data.reason ?? "invalid_domain" });
        setError(data.message ?? "Endereço inválido.");
        setLoading(false);
        return;
      }

      let company = emptyCompanyContext(data.domain);
      if (data.snapshot && (data.status === "found" || data.status === "partial")) {
        company = applySnapshot(company, data.snapshot, data.status);
      } else {
        company = { ...company, status: data.status };
      }
      track("company_lookup_completed", { status: data.status, simulated: data.simulated });
      goToDiagnostic(company);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return; // usuário optou por continuar
      track("company_lookup_failed", { reason: "network" });
      // Falha nunca bloqueia o diagnóstico (seção 22).
      goToDiagnostic({ ...emptyCompanyContext(site.trim()), status: "provider_unavailable" });
    }
  }

  function handleSkip() {
    abortRef.current?.abort();
    track("company_lookup_skipped");
    goToDiagnostic({ ...emptyCompanyContext(), status: "manual" });
  }

  return (
    <>
      <Nav />

      <main className="bm-container" style={{ paddingBlock: "var(--space-9)" }}>
        <div className="grid-2" style={{ alignItems: "center", gap: "var(--space-8)" }}>
          <div className="stack stack-5">
            <span className="eyebrow">Diagnóstico de automação</span>
            <h1 className="bm-display-l">Mapeie um processo e visualize oportunidades de automação.</h1>
            <p className="bm-body-muted" style={{ fontSize: "var(--fs-h3)" }}>
              Comece pelo site da sua empresa para contextualizar o diagnóstico. Sem cadastro para ver o
              resultado.
            </p>

            <form className="stack stack-3" onSubmit={handleStart}>
              <div className="field">
                <label htmlFor="site">Site da empresa</label>
                <input
                  id="site"
                  name="site"
                  type="text"
                  inputMode="url"
                  autoComplete="url"
                  placeholder="empresa.com.br"
                  value={site}
                  onChange={(e) => setSite(e.target.value)}
                  className={error ? "input-error" : ""}
                  disabled={loading}
                />
                {error && <span className="err">{error}</span>}
                <span className="hint">
                  Usaremos o domínio para buscar informações cadastrais da empresa. Você poderá revisar os
                  dados encontrados. Não lemos nem analisamos o conteúdo do site.
                </span>
              </div>

              <div className="row">
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? "Buscando informações…" : "Começar meu mapa"}
                </button>
                {loading ? (
                  <button type="button" className="btn btn-ghost" onClick={handleSkip}>
                    Continuar sem aguardar
                  </button>
                ) : (
                  <button type="button" className="btn btn-ghost" onClick={handleSkip}>
                    Continuar sem informar o site
                  </button>
                )}
              </div>
            </form>
          </div>

          <PreviewBoard />
        </div>
      </main>
    </>
  );
}
