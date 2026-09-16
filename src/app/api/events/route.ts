import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateSession } from "@/lib/server/session";
import { supabaseServer } from "@/lib/server/supabase";
import { ensureSessionRow, persistEvent } from "@/lib/server/persistence";

/* POST /api/events (seção 18) — registra um evento permitido, sem texto livre
   nem dado pessoal. Best-effort. */

export const runtime = "nodejs";

const eventName = z.enum([
  "landing_viewed",
  "company_lookup_submitted",
  "company_lookup_completed",
  "company_lookup_failed",
  "company_context_confirmed",
  "company_context_corrected",
  "company_lookup_skipped",
  "template_selected",
  "diagnostic_started",
  "current_process_confirmed",
  "recommendations_viewed",
  "scope_selected",
  "lead_capture_submitted",
  "export_completed",
  "contact_request_submitted",
]);

// Metadados: apenas rótulos categóricos, números ou booleanos. Sem strings longas.
const metaSchema = z
  .record(z.union([z.string().max(40), z.number(), z.boolean()]))
  .refine((m) => Object.keys(m).length <= 12, "meta_too_large")
  .default({});

const bodySchema = z.object({ event: eventName, meta: metaSchema });

export async function POST(request: Request) {
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

  const { sessionId } = await getOrCreateSession();
  const client = supabaseServer();
  if (!client) return NextResponse.json({ persisted: false });

  try {
    const sessionRowId = await ensureSessionRow(client, sessionId);
    // Descarta qualquer chave que pareça e-mail/domínio por precaução.
    const meta: Record<string, string | number | boolean> = {};
    for (const [k, v] of Object.entries(parsed.data.meta)) {
      if (typeof v === "string" && v.includes("@")) continue;
      meta[k] = v;
    }
    await persistEvent(client, sessionRowId, parsed.data.event, meta);
    return NextResponse.json({ persisted: true });
  } catch {
    return NextResponse.json({ persisted: false }, { status: 200 });
  }
}
