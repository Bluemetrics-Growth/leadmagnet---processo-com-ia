import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/* =========================================================================
   Cliente Supabase do SERVIDOR (service role). Bypassa RLS — nunca deve ser
   importado por código de cliente. Retorna null quando não configurado, para
   a aplicação degradar para o modo offline-first sem quebrar.
   ========================================================================= */

let cached: SupabaseClient | null | undefined;

export function supabaseServer(): SupabaseClient | null {
  if (cached !== undefined) return cached;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    cached = null;
    return cached;
  }
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

export function isServerPersistenceEnabled(): boolean {
  return supabaseServer() !== null;
}
