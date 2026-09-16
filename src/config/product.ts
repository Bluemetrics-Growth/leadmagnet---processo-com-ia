import { RULES_VERSION, TEMPLATES_VERSION, COPY_VERSION } from "@/lib/domain/schemas";

/* =========================================================================
   Configuração de produto. Nomes finais de env conforme ambiente.
   Segredos JAMAIS aqui — apenas flags e limites lidos no cliente.
   ========================================================================= */

function num(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export const PRODUCT = {
  name: "Mapa de Automação Bluemetrics",
  wordmark: "bluemetrics",
  versions: {
    rules: RULES_VERSION,
    templates: TEMPLATES_VERSION,
    copy: COPY_VERSION,
  },
  limits: {
    minPhases: 2,
    maxPhases: 6,
    minActivities: 3,
    maxActivities: 20,
    maxDecisionOutputs: 3,
    lookupsPerSession: 3,
  },
  llm: {
    enabled: process.env.NEXT_PUBLIC_ENABLE_LLM_ASSIST === "true",
  },
  bookingUrl: process.env.NEXT_PUBLIC_BOOKING_URL || "",
} as const;

/** Config lida somente no servidor (rota de company-lookup). */
export const SERVER_CONFIG = {
  apollo: {
    apiKey: process.env.APOLLO_API_KEY || "",
    enabled: (process.env.APOLLO_ENRICHMENT_ENABLED ?? "true") !== "false",
    dailyLimit: num(process.env.APOLLO_DAILY_LOOKUP_LIMIT, 500),
    perSession: num(process.env.APOLLO_LOOKUPS_PER_SESSION, 3),
    timeoutMs: num(process.env.APOLLO_TIMEOUT_MS, 5000),
    useMock: process.env.COMPANY_ENRICHMENT_USE_MOCK === "true",
    endpoint: "https://api.apollo.io/api/v1/organizations/enrich",
  },
  cache: {
    positiveTtlMs: num(process.env.COMPANY_CACHE_TTL_HOURS, 168) * 60 * 60 * 1000,
    negativeTtlMs: num(process.env.COMPANY_NEGATIVE_CACHE_TTL_MINUTES, 60) * 60 * 1000,
  },
};
