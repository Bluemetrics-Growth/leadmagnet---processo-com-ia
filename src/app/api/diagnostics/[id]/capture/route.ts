import { NextResponse } from "next/server";
import { z } from "zod";
import { diagnosticSchema } from "@/lib/domain/schemas";
import { getOrCreateSession } from "@/lib/server/session";
import { supabaseServer } from "@/lib/server/supabase";
import {
  ensureDiagnosticRow,
  ensureDiagnosticRowByRef,
  ensureSessionRow,
  persistLead,
  readClientRef,
  salvageDiagnosticFields,
} from "@/lib/server/persistence";

/* POST /api/diagnostics/:id/capture (seção 18) — grava o lead no Supabase.
   Best-effort: se a persistência não estiver configurada, responde
   persisted=false e o cliente segue com o armazenamento local.

   O lead NÃO é descartado por causa do snapshot do diagnóstico. Validamos
   o lead com rigor; o diagnóstico é gravado por completo quando válido e,
   quando não, gravamos o lead com um contexto mínimo (client_ref). */

export const runtime = "nodejs";

const leadSchema = z.object({
  name: z.string().min(1).max(160),
  email: z.string().email().max(200),
  role: z.string().max(120).default(""),
  company: z.string().max(160).default(""),
  allowContact: z.boolean().default(false),
});

// O diagnóstico é aceito cru aqui e validado à parte (best-effort).
const bodySchema = z.object({
  diagnostic: z.unknown(),
  lead: leadSchema,
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 422 });
  }

  const rawDiagnostic = parsed.data.diagnostic;
  const clientRef = readClientRef(rawDiagnostic);
  if (!clientRef || clientRef !== id) {
    return NextResponse.json({ error: "id_mismatch" }, { status: 400 });
  }

  const lead = {
    ...parsed.data.lead,
    email: parsed.data.lead.email.trim().toLowerCase(),
  };

  const { sessionId } = await getOrCreateSession();
  const client = supabaseServer();
  if (!client) return NextResponse.json({ persisted: false });

  const diagResult = diagnosticSchema.safeParse(rawDiagnostic);

  try {
    const sessionRowId = await ensureSessionRow(client, sessionId);
    let diagnosticId: string;
    if (diagResult.success) {
      diagnosticId = await ensureDiagnosticRow(client, sessionRowId, diagResult.data);
    } else {
      // Snapshot inválido não pode custar o lead: grava contexto mínimo.
      console.warn(
        "[capture] diagnóstico inválido; lead salvo com contexto mínimo:",
        diagResult.error.issues.map((i) => i.path.join(".")),
      );
      diagnosticId = await ensureDiagnosticRowByRef(
        client,
        sessionRowId,
        clientRef,
        salvageDiagnosticFields(rawDiagnostic),
      );
    }
    await persistLead(client, diagnosticId, lead);
    return NextResponse.json({ persisted: true, degraded: !diagResult.success });
  } catch (err) {
    // Nunca bloqueia a experiência do usuário (o cliente já baixou o mapa).
    console.error("[capture] falha ao persistir lead:", err);
    return NextResponse.json({ persisted: false }, { status: 200 });
  }
}
