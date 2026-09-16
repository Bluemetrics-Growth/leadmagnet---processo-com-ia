"use client";

import type { ProcessGraph as Graph } from "@/lib/domain/schemas";

/* =========================================================================
   Fluxograma secundário (seção 4.5). SVG somente leitura — mostra conexões,
   decisões e retornos. Não depende de arrastar nem de navegar um canvas.
   Layout vertical simples por ordem, legível também no celular.
   ========================================================================= */

const NODE_W = 220;
const NODE_H = 54;
const GAP_Y = 40;
const PAD = 24;

const EDGE_STYLE: Record<string, { color: string; dash: string }> = {
  sequence: { color: "var(--neutral-400)", dash: "0" },
  decision: { color: "var(--bm-cyan)", dash: "0" },
  return: { color: "var(--bm-magenta)", dash: "6 5" },
};

export function ProcessGraphView({ graph }: { graph: Graph }) {
  const ordered = [...graph.activities].sort((a, b) => a.order - b.order);
  if (ordered.length === 0) {
    return <p className="muted text-sm">Adicione atividades para visualizar o fluxo.</p>;
  }

  const positions = new Map<string, { x: number; y: number }>();
  ordered.forEach((a, i) => {
    positions.set(a.id, { x: PAD, y: PAD + i * (NODE_H + GAP_Y) });
  });

  const height = PAD * 2 + ordered.length * NODE_H + (ordered.length - 1) * GAP_Y;
  const width = NODE_W + PAD * 2 + 80; // espaço à direita para arcos de retorno

  function center(id: string) {
    const p = positions.get(id)!;
    return { x: p.x + NODE_W / 2, y: p.y + NODE_H / 2 };
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        style={{ maxWidth: width, display: "block" }}
        role="img"
        aria-label="Fluxograma do processo"
      >
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 z" fill="var(--neutral-500)" />
          </marker>
        </defs>

        {graph.connections.map((c) => {
          const from = positions.get(c.from);
          const to = positions.get(c.to);
          if (!from || !to) return null;
          const style = EDGE_STYLE[c.type] ?? EDGE_STYLE.sequence;
          const a = center(c.from);
          const b = center(c.to);
          let d: string;
          if (c.type === "return") {
            // Arco à direita, ligando destino (acima) a origem (abaixo).
            const rx = from.x + NODE_W + 40;
            d = `M ${from.x + NODE_W} ${a.y} C ${rx} ${a.y}, ${rx} ${b.y}, ${to.x + NODE_W} ${b.y}`;
          } else {
            d = `M ${a.x} ${from.y + NODE_H} L ${b.x} ${to.y}`;
          }
          return (
            <g key={c.id}>
              <path d={d} fill="none" stroke={style.color} strokeWidth={1.6} strokeDasharray={style.dash} markerEnd="url(#arrow)" />
              {c.condition && (
                <text x={(a.x + b.x) / 2 + 6} y={(from.y + NODE_H + to.y) / 2} fontSize="11" fill="var(--fg-2)">
                  {c.condition}
                </text>
              )}
            </g>
          );
        })}

        {ordered.map((a) => {
          const p = positions.get(a.id)!;
          const isApproval = a.mandatoryHumanApproval === "yes" || a.kind === "approve";
          return (
            <g key={a.id}>
              <rect
                x={p.x}
                y={p.y}
                width={NODE_W}
                height={NODE_H}
                rx={12}
                fill="#fff"
                stroke={isApproval ? "var(--bm-blue)" : "var(--neutral-300)"}
                strokeWidth={isApproval ? 2 : 1}
              />
              <text x={p.x + 14} y={p.y + NODE_H / 2 + 4} fontSize="13" fill="var(--fg-1)" fontFamily="var(--font-body)">
                {a.label.length > 26 ? a.label.slice(0, 25) + "…" : a.label}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="row text-sm muted" style={{ marginTop: "var(--space-3)", gap: "var(--space-4)" }}>
        <span>— Sequência</span>
        <span style={{ color: "var(--bm-cyan)" }}>— Decisão</span>
        <span style={{ color: "var(--bm-magenta)" }}>- - Retorno</span>
        <span style={{ color: "var(--bm-blue)" }}>▭ Aprovação humana</span>
      </div>
    </div>
  );
}
