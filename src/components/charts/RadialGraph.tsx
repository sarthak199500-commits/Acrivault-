import { useMemo, useState } from 'react';
import type { ReachEdge, ReachNode } from '@/mocks/types';

export type ReachKind = ReachNode['kind'];

const KIND_COLOR: Record<ReachKind, string> = {
  origin: 'var(--accent)',
  direct: 'var(--cat-2)',
  transitive: 'var(--cat-3)',
  cascade: 'var(--risk-critical)',
};
const KIND_LABEL: Record<ReachKind, string> = {
  origin: 'Origin',
  direct: 'Direct',
  transitive: 'Transitive',
  cascade: 'Cascade',
};

interface Placed extends ReachNode {
  x: number;
  y: number;
}

const W = 520;
const H = 460;
const CX = W / 2;
const CY = H / 2;
const R1 = 120; // direct ring
const R2 = 205; // transitive / cascade ring

function layout(nodes: ReachNode[], edges: ReachEdge[]): Map<string, Placed> {
  const placed = new Map<string, Placed>();
  const origin = nodes.find((n) => n.kind === 'origin');
  if (origin) placed.set(origin.id, { ...origin, x: CX, y: CY });

  const directs = nodes.filter((n) => n.kind === 'direct');
  const directAngle = new Map<string, number>();
  directs.forEach((n, i) => {
    const angle = -Math.PI / 2 + (i / Math.max(1, directs.length)) * Math.PI * 2;
    directAngle.set(n.id, angle);
    placed.set(n.id, { ...n, x: CX + R1 * Math.cos(angle), y: CY + R1 * Math.sin(angle) });
  });

  // Outer nodes grouped by their parent (the edge.from) so siblings fan out near it.
  const outer = nodes.filter((n) => n.kind === 'transitive' || n.kind === 'cascade');
  const parentOf = new Map<string, string>();
  for (const e of edges) parentOf.set(e.to, e.from);
  const byParent = new Map<string, ReachNode[]>();
  for (const n of outer) {
    const p = parentOf.get(n.id) ?? origin?.id ?? '';
    if (!byParent.has(p)) byParent.set(p, []);
    byParent.get(p)?.push(n);
  }
  for (const [parent, kids] of byParent) {
    const base = directAngle.get(parent) ?? -Math.PI / 2;
    const spread = Math.min(0.9, 0.28 * kids.length);
    kids.forEach((n, i) => {
      const offset = kids.length === 1 ? 0 : (i / (kids.length - 1) - 0.5) * spread;
      const angle = base + offset;
      placed.set(n.id, { ...n, x: CX + R2 * Math.cos(angle), y: CY + R2 * Math.sin(angle) });
    });
  }
  return placed;
}

export function RadialGraph({
  nodes,
  edges,
  visibleKinds,
}: {
  nodes: ReachNode[];
  edges: ReachEdge[];
  visibleKinds: Set<ReachKind>;
}) {
  const [active, setActive] = useState<string | null>(null);
  const placed = useMemo(() => layout(nodes, edges), [nodes, edges]);

  const isVisible = (id: string) => {
    const n = placed.get(id);
    return n ? visibleKinds.has(n.kind) : false;
  };

  const summary = `Reachability graph: ${nodes.filter((n) => n.kind === 'direct').length} direct, ${nodes.filter((n) => n.kind === 'transitive').length} transitive, ${nodes.filter((n) => n.kind === 'cascade').length} cascade nodes reachable from the origin.`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full"
      role="img"
      aria-label={summary}
    >
      {/* guide rings */}
      <circle cx={CX} cy={CY} r={R1} fill="none" stroke="var(--grid-line)" strokeDasharray="2 4" />
      <circle cx={CX} cy={CY} r={R2} fill="none" stroke="var(--grid-line)" strokeDasharray="2 4" />

      {/* edges */}
      {edges.map((e, i) => {
        const a = placed.get(e.from);
        const b = placed.get(e.to);
        if (!a || !b || !isVisible(e.from) || !isVisible(e.to)) return null;
        const dimmed = active && active !== e.from && active !== e.to;
        return (
          <line
            key={i}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke={KIND_COLOR[e.kind]}
            strokeWidth={e.kind === 'cascade' ? 1.6 : 1}
            strokeOpacity={dimmed ? 0.12 : e.kind === 'direct' ? 0.5 : 0.35}
            strokeDasharray={e.kind === 'transitive' ? '4 3' : undefined}
          />
        );
      })}

      {/* nodes */}
      {[...placed.values()].map((n) => {
        if (!visibleKinds.has(n.kind)) return null;
        const r = n.kind === 'origin' ? 11 : n.kind === 'direct' ? 7 : 5.5;
        const isActive = active === n.id;
        return (
          <g
            key={n.id}
            transform={`translate(${n.x},${n.y})`}
            tabIndex={0}
            role="img"
            aria-label={`${KIND_LABEL[n.kind]}: ${n.label}`}
            onMouseEnter={() => setActive(n.id)}
            onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(n.id)}
            onBlur={() => setActive(null)}
            className="cursor-default"
          >
            <circle
              r={isActive ? r + 2 : r}
              fill={KIND_COLOR[n.kind]}
              stroke="var(--surface)"
              strokeWidth={2}
              fillOpacity={n.kind === 'origin' ? 1 : 0.92}
            />
            {n.kind === 'origin' && (
              <circle r={r + 5} fill="none" stroke={KIND_COLOR.origin} strokeOpacity={0.4} />
            )}
            {(isActive || n.kind === 'origin') && (
              <text
                x={0}
                y={r + 13}
                textAnchor="middle"
                className="pointer-events-none font-mono"
                style={{ fontSize: 10, fill: 'var(--text-secondary)' }}
              >
                {n.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export { KIND_COLOR, KIND_LABEL };
