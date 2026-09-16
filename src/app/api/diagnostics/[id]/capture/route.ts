import { NextResponse } from "next/server";
import { z } from "zod";
import { diagnosticSchema } from "@/lib/domain/schemas";
import { getOrCreateSession } from "@/lib/server/session";
import { supabaseServer } from "@/lib/server/supabase";
import { ensureSessionRow, persistLeadConversion } from "@/lib/server/persistence";

/* POST /api/diagnostics/:id/capture (seção 18) — grava o lead no Supabase.
   Best-effort: se a persistência não estiver configurada, responde
   persisted=false e o cliente segue com o armazenamento local. */

export const runtime = "nodejs";

const bodySchema = z.object({
  diagnostic: diagnosticSchema,
  lead: z.object({
    name: z.string().min(1).max(160),
    email: z.string().email().max(200),
    role: z.string().max(120).default(""),
    company: z.string().max(160).default(""),
    allowContact: z.boolean().default(false),
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
    await persistLeadConversion(client, sessionRowId, parsed.data.diagnostic, {
      ...parsed.data.lead,
      email: parsed.data.lead.email.trim().toLowerCase(),
    });
    return NextResponse.json({ persisted: true });
  } catch {
    // Nunca bloqueia a experiência do usuário (o cliente já salvou localmente).
    return NextResponse.json({ persisted: false }, { status: 200 });
  }
}
