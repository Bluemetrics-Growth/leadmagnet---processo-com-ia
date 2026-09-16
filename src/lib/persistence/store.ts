import type { Diagnostic } from "@/lib/domain/schemas";

/* =========================================================================
   Persistência do MVP: navegador (localStorage), atrás de uma interface
   simples. Produção troca por Supabase sem mudar os chamadores.
   Recuperação entre dispositivos por e-mail NÃO é suportada (seção 16).
   ========================================================================= */

const DIAG_PREFIX = "bm.diagnostic.";
const LEADS_KEY = "bm.leads";
const CONTACT_KEY = "bm.contactRequests";

export interface Lead {
  id: string;
  name: string;
  email: string; // normalizado (lowercase) — não é identidade verificada
  role: string;
  company: string;
  diagnosticId: string;
  createdAt: string;
  /** Consentimento separado do download (seção 6). */
  allowContact: boolean;
}

export interface ContactRequest {
  id: string;
  diagnosticId: string;
  scope: string;
  hasProcessOwner: boolean;
  timeline: string;
  budgetInDiscussion: string | null;
  createdAt: string;
}

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

function readList<T>(key: string): T[] {
  const raw = safeGet(key);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as T[];
  } catch {
    return [];
  }
}

export function saveLead(lead: Lead): void {
  const leads = readList<Lead>(LEADS_KEY);
  // E-mail normalizado único; vários diagnósticos por lead.
  const existing = leads.find((l) => l.email === lead.email && l.diagnosticId === lead.diagnosticId);
  if (existing) {
    Object.assign(existing, lead);
  } else {
    leads.push(lead);
  }
  safeSet(LEADS_KEY, JSON.stringify(leads));
}

export function listLeads(): Lead[] {
  return readList<Lead>(LEADS_KEY);
}

export function saveContactRequest(req: ContactRequest): void {
  const reqs = readList<ContactRequest>(CONTACT_KEY);
  // Idempotência simples por diagnóstico + recorte (seção 18).
  const dup = reqs.find((r) => r.diagnosticId === req.diagnosticId && r.scope === req.scope);
  if (dup) return;
  reqs.push(req);
  safeSet(CONTACT_KEY, JSON.stringify(reqs));
}

export function listContactRequests(): ContactRequest[] {
  return readList<ContactRequest>(CONTACT_KEY);
}
