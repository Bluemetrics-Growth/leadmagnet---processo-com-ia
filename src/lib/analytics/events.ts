/* =========================================================================
   Eventos de produto (seção 21). SEM domínio, e-mail ou texto livre.
   No MVP, registrados em memória e no console; produção envia a product_events.
   ========================================================================= */

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
    // Instrumentação leve; substituível por endpoint /api/events em produção.
    window.dispatchEvent(new CustomEvent("bm:event", { detail: { event, meta: safeMeta } }));
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
