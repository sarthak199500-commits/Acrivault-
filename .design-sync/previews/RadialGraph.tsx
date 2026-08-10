import { RadialGraph } from 'acrivault';
import type { ReachNode, ReachEdge } from 'acrivault';

/* The SVG is w-full h-auto, so it fills a sized-width parent and scales by its
 * aspect ratio. The origin sits at the center; direct children fan out on the
 * inner ring (evenly by angle), transitive/cascade nodes sit on the outer ring
 * near their parent. Four+ directs give a proper radial spread — two would stack
 * collinearly (the layout places them at evenly-spaced angles). */
const NODES: ReachNode[] = [
  { id: 'o', identityId: 'o', label: 'payments-api', kind: 'origin' },
  { id: 'd1', identityId: 'd1', label: 'svc-a', kind: 'direct' },
  { id: 'd2', identityId: 'd2', label: 'svc-b', kind: 'direct' },
  { id: 'd3', identityId: 'd3', label: 'svc-c', kind: 'direct' },
  { id: 'd4', identityId: 'd4', label: 'svc-d', kind: 'direct' },
  { id: 't1', identityId: 't1', label: 'key-x', kind: 'transitive' },
  { id: 't2', identityId: 't2', label: 'key-y', kind: 'transitive' },
  { id: 'c1', identityId: 'c1', label: 'agent-z', kind: 'cascade' },
];
const EDGES: ReachEdge[] = [
  { from: 'o', to: 'd1', kind: 'direct' },
  { from: 'o', to: 'd2', kind: 'direct' },
  { from: 'o', to: 'd3', kind: 'direct' },
  { from: 'o', to: 'd4', kind: 'direct' },
  { from: 'd1', to: 't1', kind: 'transitive' },
  { from: 'd2', to: 't2', kind: 'transitive' },
  { from: 'd3', to: 'c1', kind: 'cascade' },
];

/** Full blast radius — four direct hops fan out from the origin, with transitive
 *  and cascade reach one ring further out, colored by kind. */
export function FullReach() {
  return (
    <div style={{ background: 'var(--bg)', borderRadius: 'var(--r-md)', padding: 20, maxWidth: 380 }}>
      <RadialGraph
        nodes={NODES}
        edges={EDGES}
        visibleKinds={new Set(['origin', 'direct', 'transitive', 'cascade'])}
      />
    </div>
  );
}

/** Direct-only — filtering visibleKinds collapses the graph to first-hop reach,
 *  hiding the transitive and cascade ring. */
export function DirectOnly() {
  return (
    <div style={{ background: 'var(--bg)', borderRadius: 'var(--r-md)', padding: 20, maxWidth: 380 }}>
      <RadialGraph
        nodes={NODES}
        edges={EDGES}
        visibleKinds={new Set(['origin', 'direct'])}
      />
    </div>
  );
}
