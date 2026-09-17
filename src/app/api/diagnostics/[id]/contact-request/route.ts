import { NextResponse } from "next/server";
import { z } from "zod";
import { diagnosticSchema } from "@/lib/domain/schemas";
import { getOrCreateSession } from "@/lib/server/session";
import { supabaseServer } from "@/lib/server/supabase";
import {
  ensureDiagnosticRow,
  ensureDiagnosticRowByRef,
  ensureSessionRow,
  persistContactRequestRow,
  readClientRef,
  salvageDiagnosticFields,
} from "@/lib/server/persistence";

/* POST /api/diagnostics/:id/contact-request (seção 18) — solicitação de
   avaliação, idempotente. Best-effort como o capture.

   A solicitação NÃO é descartada por causa do snapshot do diagnóstico:
   validamos a solicitação com rigor e gravamos o diagnóstico por completo
   quando válido, ou com contexto mínimo (client_ref) quando não. */

export const runtime = "nodejs";

const requestSchema = z.object({
  scope: z.string().max(2000).default(""),
  hasProcessOwner: z.boolean().default(false),
  timeline: z.string().max(200).default(""),
  budgetInDiscussion: z.string().max(200).nullable().default(null),
  idempotencyKey: z.string().min(1).max(200),
});

const bodySchema = z.object({
  diagnostic: z.unknown(),
  request: requestSchema,
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
      console.warn(
        "[contact-request] diagnóstico inválido; solicitação salva com contexto mínimo:",
        diagResult.error.issues.map((i) => i.path.join(".")),
      );
      diagnosticId = await ensureDiagnosticRowByRef(
        client,
        sessionRowId,
        clientRef,
        salvageDiagnosticFields(rawDiagnostic),
      );
    }
    await persistContactRequestRow(client, diagnosticId, parsed.data.request);
    return NextResponse.json({ persisted: true, degraded: !diagResult.success });
  } catch (err) {
    console.error("[contact-request] falha ao persistir solicitação:", err);
    return NextResponse.json({ persisted: false }, { status: 200 });
  }
}
