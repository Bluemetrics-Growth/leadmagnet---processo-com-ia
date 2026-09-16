import { NextResponse } from "next/server";
import { z } from "zod";
import { diagnosticSchema } from "@/lib/domain/schemas";
import { getOrCreateSession } from "@/lib/server/session";
import { supabaseServer } from "@/lib/server/supabase";
import { ensureSessionRow, persistContactRequest } from "@/lib/server/persistence";

/* POST /api/diagnostics/:id/contact-request (seção 18) — solicitação de
   avaliação, idempotente. Best-effort como o capture. */

export const runtime = "nodejs";

const bodySchema = z.object({
  diagnostic: diagnosticSchema,
  request: z.object({
    scope: z.string().max(2000).default(""),
    hasProcessOwner: z.boolean().default(false),
    timeline: z.string().max(200).default(""),
    budgetInDiscussion: z.string().max(200).nullable().default(null),
    idempotencyKey: z.string().min(1).max(200),
  }),
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
  if (parsed.data.diagnostic.id !== id) {
    return NextResponse.json({ error: "id_mismatch" }, { status: 400 });
  }

  const { sessionId } = await getOrCreateSession();
  const client = supabaseServer();
  if (!client) return NextResponse.json({ persisted: false });

  try {
    const sessionRowId = await ensureSessionRow(client, sessionId);
    await persistContactRequest(client, sessionRowId, parsed.data.diagnostic, parsed.data.request);
    return NextResponse.json({ persisted: true });
  } catch {
    return NextResponse.json({ persisted: false }, { status: 200 });
  }
}
