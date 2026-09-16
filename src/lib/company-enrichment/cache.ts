import type { LookupResult } from "./types";

/* =========================================================================
   Cache e controle de custo (seção 8.7).
   MVP: memória do processo. Produção troca por Supabase (company_lookup_cache
   / company_lookup_usage) sem alterar a interface deste módulo.
   O cache guarda SOMENTE dados do provedor — nunca respostas do usuário.
   ========================================================================= */

interface CacheEntry {
  result: LookupResult;
  expiresAt: number;
}

const positiveCache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<LookupResult>>();

/** Contadores por dia (chave AAAA-MM-DD) e por sessão. */
const dailyCount = new Map<string, number>();
const sessionDomains = new Map<string, Set<string>>();

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getCached(domain: string): LookupResult | null {
  const entry = positiveCache.get(domain);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    positiveCache.delete(domain);
    return null;
  }
  return entry.result;
}

export function setCached(domain: string, result: LookupResult, positiveTtlMs: number, negativeTtlMs: number): void {
  // Falha de credencial/indisponibilidade NÃO é cacheada como "não encontrado".
  if (result.status === "provider_unavailable" || result.status === "rate_limited") return;

  const ttl = result.status === "not_found" ? negativeTtlMs : positiveTtlMs;
  positiveCache.set(domain, { result, expiresAt: Date.now() + ttl });
}

export function getInflight(domain: string): Promise<LookupResult> | undefined {
  return inflight.get(domain);
}

export function setInflight(domain: string, p: Promise<LookupResult>): void {
  inflight.set(domain, p);
  p.finally(() => inflight.delete(domain)).catch(() => {});
}

export function dailyBudgetReached(limit: number): boolean {
  return (dailyCount.get(today()) ?? 0) >= limit;
}

export function incrementDaily(): void {
  const key = today();
  dailyCount.set(key, (dailyCount.get(key) ?? 0) + 1);
}

/** Retorna true se a sessão já pode consultar este domínio dentro do limite. */
export function sessionCanLookup(sessionId: string, domain: string, perSession: number): boolean {
  const set = sessionDomains.get(sessionId);
  if (!set) return true;
  if (set.has(domain)) return true; // repetir o mesmo domínio não conta de novo
  return set.size < perSession;
}

export function recordSessionLookup(sessionId: string, domain: string): void {
  const set = sessionDomains.get(sessionId) ?? new Set<string>();
  set.add(domain);
  sessionDomains.set(sessionId, set);
}

/** Apenas para testes. */
export function __resetCaches(): void {
  positiveCache.clear();
  inflight.clear();
  dailyCount.clear();
  sessionDomains.clear();
}
