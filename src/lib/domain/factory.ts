import { makeId } from "@/lib/id";
import { RULES_VERSION, TEMPLATES_VERSION } from "./schemas";
import type {
  CompanyContext,
  CompanySnapshot,
  Diagnostic,
  ProvenancedField,
} from "./schemas";

/* =========================================================================
   Fábricas de domínio — criação de agregados com proveniência consistente.
   ========================================================================= */

function emptyField(): ProvenancedField {
  return { value: null, source: "user", at: new Date().toISOString() };
}

export function emptyCompanyContext(domain: string | null = null): CompanyContext {
  return {
    status: "idle",
    domain,
    apolloSnapshot: null,
    confirmed: {
      name: emptyField(),
      domain: { value: domain, source: "user", at: new Date().toISOString() },
      industry: emptyField(),
      employeeRange: emptyField(),
      location: emptyField(),
      operationUnit: emptyField(),
    },
    contextConfirmed: false,
  };
}

/** Aplica um snapshot do Apollo ao contexto, registrando proveniência. */
export function applySnapshot(
  ctx: CompanyContext,
  snapshot: CompanySnapshot,
  status: CompanyContext["status"],
): CompanyContext {
  const now = new Date().toISOString();
  const field = (value: string | null): ProvenancedField => ({ value, source: "apollo", at: now });
  return {
    ...ctx,
    status,
    domain: snapshot.domain ?? ctx.domain,
    apolloSnapshot: snapshot,
    confirmed: {
      ...ctx.confirmed,
      name: snapshot.name ? field(snapshot.name) : ctx.confirmed.name,
      domain: snapshot.domain ? field(snapshot.domain) : ctx.confirmed.domain,
      industry: snapshot.industry ? field(snapshot.industry) : ctx.confirmed.industry,
      employeeRange: snapshot.employeeRange ? field(snapshot.employeeRange) : ctx.confirmed.employeeRange,
      location: snapshot.location ? field(snapshot.location) : ctx.confirmed.location,
    },
  };
}

export function createDiagnostic(company?: CompanyContext): Diagnostic {
  const now = new Date().toISOString();
  return {
    id: makeId("diag"),
    status: "preliminary",
    createdAt: now,
    updatedAt: now,
    version: 0,
    rulesVersion: RULES_VERSION,
    templatesVersion: TEMPLATES_VERSION,
    company: company ?? emptyCompanyContext(),
    process: null,
    current: { phases: [], activities: [], connections: [], systems: [] },
    currentConfirmed: false,
    scope: null,
    simulation: null,
  };
}
