import { NextResponse } from "next/server";
import { z } from "zod";
import { lookupCompany } from "@/lib/company-enrichment/service";
import { DOMAIN_ERROR_MESSAGE, type DomainError } from "@/lib/company-enrichment/normalize-domain";
import { getOrCreateSession } from "@/lib/server/session";

/* =========================================================================
   POST /api/company-lookup  (seção 18)
   Consulta domínio via cache/Apollo. Exige sessão válida, valida o domínio
   e verifica os limites ANTES de acessar o provedor. Segredo só no servidor.
   ========================================================================= */

export const runtime = "nodejs";

const bodySchema = z.object({
  site: z.string().min(1).max(300),
});

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const { sessionId } = await getOrCreateSession();
  const outcome = await lookupCompany(parsed.data.site, sessionId);

  if (outcome.domainError) {
    const reason = outcome.domainError as DomainError;
    return NextResponse.json(
      {
        status: "not_found",
        error: "invalid_domain",
        reason,
        message: DOMAIN_ERROR_MESSAGE[reason],
      },
      { status: 422 },
    );
  }

  // Nunca expõe segredos; devolve apenas o snapshot reduzido do provedor.
  return NextResponse.json({
    status: outcome.status,
    domain: outcome.domain,
    snapshot: outcome.snapshot,
    simulated: outcome.simulated,
    fromCache: outcome.fromCache,
  });
}
