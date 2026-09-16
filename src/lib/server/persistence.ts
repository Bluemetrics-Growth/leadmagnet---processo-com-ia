import type { SupabaseClient } from "@supabase/supabase-js";
import type { Diagnostic } from "@/lib/domain/schemas";

/* =========================================================================
   Persistência de CONVERSÃO no servidor (leads, solicitações, eventos).
   O diagnóstico continua editado no navegador; ao converter, um snapshot é
   gravado no Supabase para satisfazer as FKs e dar contexto ao comercial.
   Verificação de propriedade: tudo é amarrado à sessão do cookie.
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
  const { data, error } = await client
    .from("diagnostics")
    .upsert(
      {
        client_ref: diagnostic.id,
        session_id: sessionId,
        status: diagnostic.status,
        process_name: diagnostic.process?.name ?? null,
        rules_version: diagnostic.rulesVersion,
        templates_version: diagnostic.templatesVersion,
        version: diagnostic.version,
      },
      { onConflict: "client_ref" },
    )
    .select("id")
    .single();
  if (error) throw error;
  const diagnosticId = data.id as string;

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

export interface LeadInput {
  name: string;
  email: string; // já normalizado (lowercase)
  role: string;
  company: string;
  allowContact: boolean;
}

/** Grava lead + associação + permissão de contato. */
export async function persistLeadConversion(
  client: SupabaseClient,
  sessionId: string,
  diagnostic: Diagnostic,
  lead: LeadInput,
): Promise<void> {
  const diagnosticId = await ensureDiagnosticRow(client, sessionId, diagnostic);

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

export interface ContactRequestInput {
  scope: string;
  hasProcessOwner: boolean;
  timeline: string;
  budgetInDiscussion: string | null;
  idempotencyKey: string;
}

/** Grava solicitação de avaliação (idempotente por idempotency_key). */
export async function persistContactRequest(
  client: SupabaseClient,
  sessionId: string,
  diagnostic: Diagnostic,
  request: ContactRequestInput,
): Promise<void> {
  const diagnosticId = await ensureDiagnosticRow(client, sessionId, diagnostic);
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

/** Grava um evento de produto (sem texto livre nem dado pessoal). */
export async function persistEvent(
  client: SupabaseClient,
  sessionId: string,
  event: string,
  meta: Record<string, string | number | boolean>,
): Promise<void> {
  await client.from("product_events").insert({ session_id: sessionId, event, meta });
}
