/* =========================================================================
   Sincronização best-effort com o backend (Supabase via rotas de API).
   Nunca lança: o app é offline-first e a persistência de conversão é um
   complemento. Falhas são silenciosas para não bloquear o usuário.
   ========================================================================= */

export function postBestEffort(url: string, body: unknown, opts: { keepalive?: boolean } = {}): void {
  if (typeof window === "undefined") return;
  try {
    void fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      // keepalive tem limite de 64KB de corpo; usar só em payloads pequenos.
      keepalive: opts.keepalive ?? false,
    }).catch(() => {});
  } catch {
    /* ignore */
  }
}
