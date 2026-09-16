import { NextResponse } from "next/server";
import { importPayloadSchema } from "@/lib/domain/schemas";
import { makeId } from "@/lib/id";

/* =========================================================================
   POST /api/import (seção 18) — valida um JSON e devolve uma CÓPIA com novo
   id (não sobrescreve nada). A persistência do MVP é no navegador.
   ========================================================================= */

export const runtime = "nodejs";

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = importPayloadSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_diagnostic", issues: parsed.error.issues }, { status: 422 });
  }

  const now = new Date().toISOString();
  const copy = {
    ...parsed.data.diagnostic,
    id: makeId("diag"),
    createdAt: now,
    updatedAt: now,
    version: 0,
  };

  return NextResponse.json({ diagnostic: copy });
}
