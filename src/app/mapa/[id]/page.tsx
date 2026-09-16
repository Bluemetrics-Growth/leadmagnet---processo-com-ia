"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import type { Diagnostic } from "@/lib/domain/schemas";
import { loadDiagnostic, saveDiagnostic } from "@/lib/persistence/store";
import { Nav } from "@/components/brand/Nav";
import { Progress, WIZARD_STEPS, type WizardStep } from "@/components/wizard/Progress";
import { CompanyStep } from "@/components/company-context/CompanyStep";
import { ProcessStep } from "@/components/wizard/ProcessStep";
import { BoardStep } from "@/components/process-board/BoardStep";
import { ResultStep } from "@/components/result/ResultStep";

export default function MapaPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [diagnostic, setDiagnostic] = useState<Diagnostic | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [step, setStep] = useState<WizardStep>("company");

  useEffect(() => {
    const loaded = loadDiagnostic(id);
    if (!loaded) {
      setNotFound(true);
      return;
    }
    setDiagnostic(loaded);
    const q =
      typeof window !== "undefined"
        ? (new URLSearchParams(window.location.search).get("step") as WizardStep | null)
        : null;
    setStep(q && WIZARD_STEPS.includes(q) ? q : "company");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const update = useCallback(
    (mutator: (d: Diagnostic) => Diagnostic) => {
      setDiagnostic((prev) => {
        if (!prev) return prev;
        const next: Diagnostic = { ...mutator(prev), updatedAt: new Date().toISOString(), version: prev.version + 1 };
        saveDiagnostic(next);
        return next;
      });
    },
    [],
  );

  const goToStep = useCallback(
    (next: WizardStep) => {
      setStep(next);
      router.replace(`/mapa/${id}?step=${next}`);
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [id, router],
  );

  if (notFound) {
    return (
      <>
        <Nav />
        <main className="bm-container" style={{ paddingBlock: "var(--space-9)" }}>
          <div className="card stack stack-3">
            <h2 className="bm-display-m">Mapa não encontrado</h2>
            <p className="bm-body-muted">
              Este diagnóstico não está disponível neste navegador. No MVP, os mapas ficam salvos localmente
              e podem ser recuperados por importação de JSON.
            </p>
            <Link className="btn btn-primary" href="/" style={{ alignSelf: "flex-start" }}>
              Começar um novo mapa
            </Link>
          </div>
        </main>
      </>
    );
  }

  if (!diagnostic) {
    return (
      <>
        <Nav />
        <main className="bm-container" style={{ paddingBlock: "var(--space-9)" }}>
          <p className="muted">Carregando…</p>
        </main>
      </>
    );
  }

  const stepIndex = WIZARD_STEPS.indexOf(step);

  return (
    <>
      <Nav>
        <span className="text-sm muted no-print">Regras v{diagnostic.rulesVersion}</span>
      </Nav>
      <main className="bm-container" style={{ paddingBlock: "var(--space-7)", maxWidth: "var(--container-wide)" }}>
        <div className="stack stack-7" style={{ gap: "var(--space-7)" }}>
          <Progress current={step} />

          {step === "company" && (
            <CompanyStep diagnostic={diagnostic} update={update} goNext={() => goToStep("process")} />
          )}
          {step === "process" && (
            <ProcessStep
              diagnostic={diagnostic}
              update={update}
              goNext={() => goToStep("board")}
              goBack={() => goToStep("company")}
            />
          )}
          {step === "board" &&
            (diagnostic.process ? (
              <BoardStep
                diagnostic={diagnostic}
                update={update}
                goNext={() => goToStep("result")}
                goBack={() => goToStep("process")}
              />
            ) : (
              <RedirectToProcess onGo={() => goToStep("process")} />
            ))}
          {step === "result" &&
            (diagnostic.process ? (
              <ResultStep diagnostic={diagnostic} update={update} goBack={() => goToStep("board")} />
            ) : (
              <RedirectToProcess onGo={() => goToStep("process")} />
            ))}
        </div>
        <div style={{ height: stepIndex >= 0 ? 0 : 0 }} />
      </main>
    </>
  );
}

function RedirectToProcess({ onGo }: { onGo: () => void }) {
  return (
    <div className="card stack stack-3">
      <p>Escolha um modelo de processo antes de continuar.</p>
      <button className="btn btn-primary" style={{ alignSelf: "flex-start" }} onClick={onGo}>
        Ir para a escolha do processo
      </button>
    </div>
  );
}
