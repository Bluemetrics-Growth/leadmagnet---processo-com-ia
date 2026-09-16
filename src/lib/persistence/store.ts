import type { Diagnostic } from "@/lib/domain/schemas";

/* =========================================================================
   Persistência local do DIAGNÓSTICO (offline-first, seção 16).
   O diagnóstico é editado e recuperado no navegador. Leads e solicitações
   de avaliação NÃO ficam aqui: vão para o Supabase pelas rotas de conversão
   e serão integrados ao HubSpot depois. Este projeto não gerencia leads.
   ========================================================================= */

const DIAG_PREFIX = "bm.diagnostic.";

function safeGet(key: string): string | null {
  try {
    return typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    if (typeof window !== "undefined") window.localStorage.setItem(key, value);
  } catch {
    /* modo privado / bloqueado — perda tolerada no MVP */
  }
}

export function saveDiagnostic(diagnostic: Diagnostic): void {
  safeSet(DIAG_PREFIX + diagnostic.id, JSON.stringify(diagnostic));
}

export function loadDiagnostic(id: string): Diagnostic | null {
  const raw = safeGet(DIAG_PREFIX + id);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Diagnostic;
  } catch {
    return null;
  }
}

export function listDiagnostics(): Diagnostic[] {
  const out: Diagnostic[] = [];
  try {
    if (typeof window === "undefined") return out;
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith(DIAG_PREFIX)) {
        const raw = window.localStorage.getItem(key);
        if (raw) out.push(JSON.parse(raw) as Diagnostic);
      }
    }
  } catch {
    /* ignore */
  }
  return out.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
