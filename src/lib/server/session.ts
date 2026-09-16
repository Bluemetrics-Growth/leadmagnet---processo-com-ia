import { cookies } from "next/headers";
import { createHash, randomBytes } from "node:crypto";

/* =========================================================================
   Sessão do visitante (seção 16). Cookie seguro e HttpOnly com token
   aleatório forte; no MVP guardamos o hash no próprio valor derivado.
   Em produção, o hash é persistido em visitor_sessions (Supabase).
   ========================================================================= */

const COOKIE_NAME = "bm_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 dias

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Lê a sessão do cookie; cria uma nova (definindo o cookie) se não existir. */
export async function getOrCreateSession(): Promise<{ sessionId: string; created: boolean }> {
  const store = await cookies();
  const existing = store.get(COOKIE_NAME)?.value;
  if (existing) {
    return { sessionId: hashToken(existing), created: false };
  }

  const token = randomBytes(32).toString("hex");
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
  return { sessionId: hashToken(token), created: true };
}
