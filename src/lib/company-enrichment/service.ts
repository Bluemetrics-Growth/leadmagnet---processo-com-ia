import { SERVER_CONFIG } from "@/config/product";
import { normalizeDomain } from "./normalize-domain";
import { createApolloAdapter } from "./apollo-adapter";
import { mockAdapter } from "./mock-adapter";
import {
  dailyBudgetReached,
  getCached,
  getInflight,
  incrementDaily,
  recordSessionLookup,
  sessionCanLookup,
  setCached,
  setInflight,
} from "./cache";
import type { EnrichmentAdapter, LookupResult } from "./types";

/* =========================================================================
   Serviço de consulta empresarial (orquestra validação, cache, limites e
   adaptador). Executa SOMENTE no servidor — a chave nunca vai ao cliente.
   ========================================================================= */

export interface LookupOutcome {
  status: LookupResult["status"];
  snapshot: LookupResult["snapshot"];
  simulated: boolean;
  domain: string | null;
  fromCache: boolean;
  /** Mensagem de erro de validação de domínio, quando aplicável. */
  domainError?: string;
}

function selectAdapter(): EnrichmentAdapter {
  const { apollo } = SERVER_CONFIG;
  const useMock = apollo.useMock || !apollo.apiKey || !apollo.enabled;
  if (useMock) return mockAdapter;
  return createApolloAdapter(apollo.apiKey, apollo.endpoint);
}

export async function lookupCompany(rawDomain: string, sessionId: string): Promise<LookupOutcome> {
  const normalized = normalizeDomain(rawDomain);
  if (!normalized.ok) {
    return {
      status: "not_found",
      snapshot: null,
      simulated: false,
      domain: null,
      fromCache: false,
      domainError: normalized.reason,
    };
  }
  const domain = normalized.domain;
  const { apollo, cache } = SERVER_CONFIG;

  // Enriquecimento desligado => caminho manual.
  if (!apollo.enabled) {
    return { status: "manual", snapshot: null, simulated: false, domain, fromCache: false };
  }

  // Limite por sessão antes de qualquer acesso ao provedor.
  if (!sessionCanLookup(sessionId, domain, apollo.perSession)) {
    return { status: "budget_exceeded", snapshot: null, simulated: false, domain, fromCache: false };
  }

  // Cache positivo/negativo.
  const cached = getCached(domain);
  if (cached) {
    recordSessionLookup(sessionId, domain);
    return { ...cached, domain, fromCache: true };
  }

  // Limite diário antes de acessar o provedor.
  if (dailyBudgetReached(apollo.dailyLimit)) {
    return { status: "budget_exceeded", snapshot: null, simulated: false, domain, fromCache: false };
  }

  // Reutiliza consulta em andamento para o mesmo domínio.
  let promise = getInflight(domain);
  if (!promise) {
    const adapter = selectAdapter();
    incrementDaily();
    promise = adapter.enrich(domain, apollo.timeoutMs);
    setInflight(domain, promise);
  }

  const result = await promise;
  setCached(domain, result, cache.positiveTtlMs, cache.negativeTtlMs);
  recordSessionLookup(sessionId, domain);

  return { ...result, domain, fromCache: false };
}
