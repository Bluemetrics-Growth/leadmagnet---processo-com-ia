import type { Diagnostic } from "@/lib/domain/schemas";

/* =========================================================================
   Exportação/importação JSON (seções 6 e 16). Inclui versões de modelo e
   regras (já presentes no próprio diagnóstico).
   ========================================================================= */

export function diagnosticToJson(diagnostic: Diagnostic): string {
  return JSON.stringify({ diagnostic }, null, 2);
}

/** Dispara download no navegador. */
export function downloadFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
