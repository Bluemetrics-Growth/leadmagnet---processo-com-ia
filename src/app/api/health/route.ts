import { NextResponse } from "next/server";
import { isServerPersistenceEnabled } from "@/lib/server/supabase";

/* GET /api/health — diagnóstico seguro (nunca expõe segredos).
   Diz se o servidor enxerga as variáveis do Supabase e por qual nome,
   para distinguir "env ausente" de "código com erro". */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const has = (name: string) => Boolean(process.env[name]);
  return NextResponse.json({
    ok: true,
    persistenceEnabled: isServerPersistenceEnabled(),
    env: {
      // Apenas booleanos — os valores nunca são retornados.
      SUPABASE_URL: has("SUPABASE_URL"),
      NEXT_PUBLIC_SUPABASE_URL: has("NEXT_PUBLIC_SUPABASE_URL"),
      SUPABASE_SERVICE_ROLE_KEY: has("SUPABASE_SERVICE_ROLE_KEY"),
      SUPABASE_SERVICE_KEY: has("SUPABASE_SERVICE_KEY"),
      SUPABASE_SECRET_KEY: has("SUPABASE_SECRET_KEY"),
    },
    time: new Date().toISOString(),
  });
}
