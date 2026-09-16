import Link from "next/link";

/** Cabeçalho compacto translúcido (referência Pega + marca BM). */
export function Nav({ children }: { children?: React.ReactNode }) {
  return (
    <header className="bm-nav no-print">
      <div className="bm-container bm-nav-inner">
        <Link href="/" aria-label="bluemetrics — início">
          {/* Logo oficial; nunca recriado com texto/CSS (seção 4.3). */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/assets/logo-blue-horizontal.png" alt="bluemetrics" />
        </Link>
        <div className="spacer" />
        {children}
      </div>
    </header>
  );
}
