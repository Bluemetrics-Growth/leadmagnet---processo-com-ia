import type { CompanyLookupStatus, CompanySnapshot } from "@/lib/domain/schemas";

export interface LookupResult {
  status: CompanyLookupStatus;
  snapshot: CompanySnapshot | null;
  /** Marcado quando o resultado veio de um adaptador simulado. */
  simulated: boolean;
}

export interface EnrichmentAdapter {
  readonly name: "apollo" | "mock";
  enrich(domain: string, timeoutMs: number): Promise<LookupResult>;
}
