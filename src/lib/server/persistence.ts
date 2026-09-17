import type { SupabaseClient } from "@supabase/supabase-js";
import {
  RULES_VERSION,
  TEMPLATES_VERSION,
  type Diagnostic,
  type DiagnosticStatus,
} from "@/lib/domain/schemas";

/* =========================================================================
   Persistência de CONVERSÃO no servidor (leads, solicitações, eventos).
   O diagnóstico continua editado no navegador; ao converter, um snapshot é
   gravado no Supabase para satisfazer as FKs e dar contexto ao comercial.
   Verificação de propriedade: tudo é amarrado à sessão do cookie.

   Princípio: o LEAD (contato + consentimento) nunca é perdido por causa do
   snapshot do diagnóstico. Se o diagnóstico não validar por completo, ainda
   assim gravamos o lead com um contexto mínimo (client_ref) — a integração
   comercial (Supabase -> HubSpot) depende do contato, não do grafo.
   ========================================================================= */

const SESSION_TTL_DAYS = 30;

/** Garante a linha de sessão (por hash do token) e devolve seu uuid. */
export async function ensureSessionRow(client: SupabaseClient, tokenHash: string): Promise<string> {
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await client
    .from("visitor_sessions")
    .upsert(
      { token_hash: tokenHash, last_seen_at: new Date().toISOString(), expires_at: expiresAt },
      { onConflict: "token_hash" },
    )
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

/**
 * Garante o diagnóstico (por client_ref) e grava snapshot de contexto e versão.
 * Devolve o uuid do diagnóstico. O snapshot confirmado não sobrescreve o cache
 * compartilhado (são tabelas distintas).
 */
export async function ensureDiagnosticRow(
  client: SupabaseClient,
  sessionId: string,
  diagnostic: Diagnostic,
): Promise<string> {
  const diagnosticId = await ensureDiagnosticRowByRef(client, sessionId, diagnostic.id, {
    status: diagnostic.status,
    processName: diagnostic.process?.name ?? null,
    rulesVersion: diagnostic.rulesVersion,
    templatesVersion: diagnostic.templatesVersion,
    version: diagnostic.version,
  });

  await client.from("diagnostic_company_context").upsert(
    {
      diagnostic_id: diagnosticId,
      apollo_snapshot: diagnostic.company.apolloSnapshot,
      corrections: null,
      confirmed: diagnostic.company.confirmed,
      context_confirmed: diagnostic.company.contextConfirmed,
    },
    { onConflict: "diagnostic_id" },
  );

  await client.from("diagnostic_versions").upsert(
    {
      diagnostic_id: diagnosticId,
      version: diagnostic.version,
      current_process: diagnostic.current,
      proposal: null,
      rules_version: diagnostic.rulesVersion,
      templates_version: diagnostic.templatesVersion,
    },
    { onConflict: "diagnostic_id,version" },
  );

  return diagnosticId;
}

export interface MinimalDiagnosticFields {
  status?: DiagnosticStatus;
  processName?: string | null;
  rulesVersion?: string;
  templatesVersion?: string;
  version?: number;
}

/**
 * Garante a linha de diagnóstico apenas pelo client_ref, sem depender de um
 * diagnóstico completo/válido. Usado quando o snapshot não passa na validação
 * mas ainda precisamos de uma linha para amarrar o lead. Só preenche colunas
 * NOT NULL com padrões seguros e não sobrescreve com null o que já existe.
 */
export async function ensureDiagnosticRowByRef(
  client: SupabaseClient,
  sessionId: string,
  clientRef: string,
  fields: MinimalDiagnosticFields = {},
): Promise<string> {
  const { data, error } = await client
    .from("diagnostics")
    .upsert(
      {
        client_ref: clientRef,
        session_id: sessionId,
        status: fields.status ?? "preliminary",
        process_name: fields.processName ?? null,
        rules_version: fields.rulesVersion ?? RULES_VERSION,
        templates_version: fields.templatesVersion ?? TEMPLATES_VERSION,
        version: fields.version ?? 0,
      },
      { onConflict: "client_ref" },
    )
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

/**
 * Extrai, de um diagnóstico não validado (cru), os campos mínimos seguros para
 * a linha de diagnóstico. Ignora qualquer coisa fora do formato esperado.
 */
export function salvageDiagnosticFields(raw: unknown): MinimalDiagnosticFields {
  if (typeof raw !== "object" || raw === null) return {};
  const r = raw as Record<string, unknown>;
  const out: MinimalDiagnosticFields = {};
  if (r.status === "preliminary" || r.status === "confirmed") out.status = r.status;
  if (typeof r.version === "number" && Number.isInteger(r.version) && r.version >= 0) {
    out.version = r.version;
  }
  if (typeof r.rulesVersion === "string" && r.rulesVersion) out.rulesVersion = r.rulesVersion;
  if (typeof r.templatesVersion === "string" && r.templatesVersion) {
    out.templatesVersion = r.templatesVersion;
  }
  if (typeof r.process === "object" && r.process !== null) {
    const name = (r.process as Record<string, unknown>).name;
    if (typeof name === "string" && name) out.processName = name;
  }
  return out;
}

/** Lê um client_ref (id do diagnóstico gerado no cliente) de um payload cru. */
export function readClientRef(raw: unknown): string | null {
  if (typeof raw !== "object" || raw === null) return null;
  const id = (raw as Record<string, unknown>).id;
  return typeof id === "string" && id.length > 0 ? id : null;
}

export interface LeadInput {
  name: string;
  email: string; // já normalizado (lowercase)
  role: string;
  company: string;
  allowContact: boolean;
}

/** Grava lead + associação + permissão de contato para um diagnóstico existente. */
export async function persistLead(
  client: SupabaseClient,
  diagnosticId: string,
  lead: LeadInput,
): Promise<void> {
  const { data: leadRow, error: leadErr } = await client
    .from("leads")
    .upsert(
      { email_normalized: lead.email, name: lead.name, role: lead.role, company: lead.company },
      { onConflict: "email_normalized" },
    )
    .select("id")
    .single();
  if (leadErr) throw leadErr;
  const leadId = leadRow.id as string;

  await client
    .from("lead_diagnostics")
    .upsert({ lead_id: leadId, diagnostic_id: diagnosticId }, { onConflict: "lead_id,diagnostic_id", ignoreDuplicates: true });

  // Consentimento separado do download (seção 6).
  await client.from("permissions").insert({
    lead_id: leadId,
    diagnostic_id: diagnosticId,
    purpose: "marketing_contact",
    choice: lead.allowContact,
    notice_version: "1.0.0",
  });
}

/** Caminho feliz: diagnóstico válido -> snapshot completo + lead. */
export async function persistLeadConversion(
  client: SupabaseClient,
  sessionId: string,
  diagnostic: Diagnostic,
  lead: LeadInput,
): Promise<void> {
  const diagnosticId = await ensureDiagnosticRow(client, sessionId, diagnostic);
  await persistLead(client, diagnosticId, lead);
}

export interface ContactRequestInput {
  scope: string;
  hasProcessOwner: boolean;
  timeline: string;
  budgetInDiscussion: string | null;
  idempotencyKey: string;
}

/** Grava a linha de solicitação (idempotente por idempotency_key). */
export async function persistContactRequestRow(
  client: SupabaseClient,
  diagnosticId: string,
  request: ContactRequestInput,
): Promise<void> {
  await client.from("contact_requests").upsert(
    {
      diagnostic_id: diagnosticId,
      scope: request.scope,
      has_process_owner: request.hasProcessOwner,
      timeline: request.timeline,
      budget_in_discussion: request.budgetInDiscussion,
      idempotency_key: request.idempotencyKey,
    },
    { onConflict: "idempotency_key", ignoreDuplicates: true },
  );
}

/** Caminho feliz: diagnóstico válido -> snapshot completo + solicitação. */
export async function persistContactRequest(
  client: SupabaseClient,
  sessionId: string,
  diagnostic: Diagnostic,
  request: ContactRequestInput,
): Promise<void> {
  const diagnosticId = await ensureDiagnosticRow(client, sessionId, diagnostic);
  await persistContactRequestRow(client, diagnosticId, request);
}

/** Grava um evento de produto (sem texto livre nem dado pessoal). */
export async function persistEvent(
  client: SupabaseClient,
  sessionId: string,
  event: string,
  meta: Record<string, string | number | boolean>,
): Promise<void> {
  await client.from("product_events").insert({ session_id: sessionId, event, meta });
}
