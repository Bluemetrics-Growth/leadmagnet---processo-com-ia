import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mapa de Automação Bluemetrics",
  description:
    "Mapeie um processo e visualize oportunidades de automação. Diagnóstico preliminar, explicável e editável.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0c27e8",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        {/* Tokens oficiais da marca — carregados antes da app para preservar
            os caminhos relativos das fontes self-hosted em /brand/fonts. */}
        <link rel="stylesheet" href="/brand/colors_and_type.css" />
      </head>
      <body>{children}</body>
    </html>
  );
}
