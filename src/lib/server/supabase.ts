import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/* =========================================================================
   Cliente Supabase do SERVIDOR (service role). Bypassa RLS — nunca deve ser
   importado por código de cliente. Retorna null quando não configurado, para
   a aplicação degradar para o modo offline-first sem quebrar.
   ========================================================================= */

let cached: SupabaseClient | null | undefined;

/** URL do Supabase, aceitando os nomes de variável mais comuns. */
export function resolveSupabaseUrl(): string | undefined {
  return process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || undefined;
}

/** Service role key (SECRETA), aceitando os nomes de variável mais comuns. */
export function resolveServiceRoleKey(): string | undefined {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    undefined
  );
}

export function supabaseServer(): SupabaseClient | null {
  if (cached !== undefined) return cached;
  const url = resolveSupabaseUrl();
  const key = resolveServiceRoleKey();
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
