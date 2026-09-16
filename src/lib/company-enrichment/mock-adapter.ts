import type { CompanySnapshot } from "@/lib/domain/schemas";
import type { EnrichmentAdapter, LookupResult } from "./types";

/* =========================================================================
   Adaptador simulado (desenvolvimento / preview).
   Dados determinísticos derivados do domínio, SEMPRE marcados simulados.
   Nunca devem ser apresentados como dados reais de uma empresa (seção 19).
   ========================================================================= */

const INDUSTRIES = [
  "Tecnologia da informação",
  "Serviços financeiros",
  "Saúde",
  "Varejo",
  "Indústria",
  "Logística",
];
const SIZES = ["11-50", "51-200", "201-500", "501-1000", "1001-5000"];
const LOCATIONS = ["São Paulo, BR", "Rio de Janeiro, BR", "Belo Horizonte, BR", "Curitiba, BR"];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function titleize(domain: string): string {
  const core = domain.split(".")[0] ?? domain;
  return core
    .split(/[-_]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export const mockAdapter: EnrichmentAdapter = {
  name: "mock",
  async enrich(domain: string): Promise<LookupResult> {
    // Domínios sentinela exercitam os estados da jornada.
    if (domain.startsWith("naoexiste") || domain.endsWith(".invalid")) {
      return { status: "not_found", snapshot: null, simulated: true };
    }

    const h = hash(domain);
    const snapshot: CompanySnapshot = {
      name: titleize(domain),
      domain,
      industry: INDUSTRIES[h % INDUSTRIES.length],
      employeeRange: SIZES[(h >> 3) % SIZES.length],
      location: LOCATIONS[(h >> 6) % LOCATIONS.length],
      simulated: true,
    };

    // Alguns domínios retornam parcial (sem porte/localização).
    if (h % 5 === 0) {
      return {
        status: "partial",
        snapshot: { ...snapshot, employeeRange: null, location: null },
        simulated: true,
      };
    }

    return { status: "found", snapshot, simulated: true };
  },
};
