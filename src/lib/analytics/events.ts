/* =========================================================================
   Eventos de produto (seção 21). SEM domínio, e-mail ou texto livre.
   Registrados em memória e enviados best-effort a /api/events (product_events).
   ========================================================================= */

import { postBestEffort } from "@/lib/client/sync";

export type ProductEvent =
  | "landing_viewed"
  | "company_lookup_submitted"
  | "company_lookup_completed"
  | "company_lookup_failed"
  | "company_context_confirmed"
  | "company_context_corrected"
  | "company_lookup_skipped"
  | "template_selected"
  | "diagnostic_started"
  | "current_process_confirmed"
  | "recommendations_viewed"
  | "scope_selected"
  | "lead_capture_submitted"
  | "export_completed"
  | "contact_request_submitted";

/** Metadados permitidos: apenas rótulos categóricos e contadores. */
export type EventMeta = Record<string, string | number | boolean>;

const buffer: Array<{ event: ProductEvent; meta: EventMeta; at: string }> = [];

export function track(event: ProductEvent, meta: EventMeta = {}): void {
  const safeMeta = sanitize(meta);
  buffer.push({ event, meta: safeMeta, at: new Date().toISOString() });
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("bm:event", { detail: { event, meta: safeMeta } }));
    // Envio best-effort ao backend (Supabase). No-op se não configurado.
    // Payload pequeno: keepalive garante o envio mesmo durante navegação.
    postBestEffort("/api/events", { event, meta: safeMeta }, { keepalive: true });
  }
}

/** Remove qualquer campo que pareça texto livre ou dado pessoal. */
function sanitize(meta: EventMeta): EventMeta {
  const out: EventMeta = {};
  for (const [k, v] of Object.entries(meta)) {
    if (typeof v === "string" && (v.includes("@") || v.length > 40)) continue;
    out[k] = v;
  }
  return out;
}

export function getEventBuffer() {
  return [...buffer];
}
