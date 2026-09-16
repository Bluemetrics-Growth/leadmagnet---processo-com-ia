import type { CompanySnapshot } from "@/lib/domain/schemas";
import type { EnrichmentAdapter, LookupResult } from "./types";

/* =========================================================================
   Adaptador Apollo real (seção 8.1). Consulta SOMENTE o endpoint fixo de
   enriquecimento de organização; nunca busca a URL informada pelo usuário.
   Uma resposta HTTP 200 só vira "found" após validar o payload (seção 8.6).
   ========================================================================= */

function firstString(...values: unknown[]): string | null {
  for (const v of values) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

function parseEmployeeRange(org: Record<string, unknown>): string | null {
  const count = org["estimated_num_employees"];
  if (typeof count === "number" && count > 0) return String(count);
  return null;
}

function parseLocation(org: Record<string, unknown>): string | null {
  const city = firstString(org["city"]);
  const country = firstString(org["country"]);
  if (city && country) return `${city}, ${country}`;
  return firstString(org["country"], org["city"]);
}

export function createApolloAdapter(apiKey: string, endpoint: string): EnrichmentAdapter {
  return {
    name: "apollo",
    async enrich(domain: string, timeoutMs: number): Promise<LookupResult> {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const url = new URL(endpoint);
        url.searchParams.set("domain", domain);

        const res = await fetch(url.toString(), {
          method: "GET",
          headers: {
            accept: "application/json",
            "x-api-key": apiKey,
          },
          signal: controller.signal,
        });

        if (res.status === 401 || res.status === 403) {
          // Falha de credencial NÃO é "empresa não encontrada" (seção 8.7).
          return { status: "provider_unavailable", snapshot: null, simulated: false };
        }
        if (res.status === 429) {
          return { status: "rate_limited", snapshot: null, simulated: false };
        }
        if (!res.ok) {
          return { status: "provider_unavailable", snapshot: null, simulated: false };
        }

        const body = (await res.json()) as Record<string, unknown>;
        const org = (body["organization"] ?? null) as Record<string, unknown> | null;
        if (!org || typeof org !== "object") {
          return { status: "not_found", snapshot: null, simulated: false };
        }

        const snapshot: CompanySnapshot = {
          name: firstString(org["name"]),
          domain: firstString(org["primary_domain"], org["website_url"], domain) ?? domain,
          industry: firstString(org["industry"]),
          employeeRange: parseEmployeeRange(org),
          location: parseLocation(org),
          simulated: false,
        };

        if (!snapshot.name) {
          return { status: "not_found", snapshot: null, simulated: false };
        }

        const complete = snapshot.industry && snapshot.employeeRange && snapshot.location;
        return {
          status: complete ? "found" : "partial",
          snapshot,
          simulated: false,
        };
      } catch (err) {
        const aborted = err instanceof Error && err.name === "AbortError";
        return {
          status: aborted ? "provider_unavailable" : "provider_unavailable",
          snapshot: null,
          simulated: false,
        };
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
