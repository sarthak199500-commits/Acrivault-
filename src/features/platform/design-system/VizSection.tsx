import { Sparkline } from '@/components/ui/Sparkline';
import { RadialGraph } from '@/components/charts/RadialGraph';
import { BarChart } from '@/components/charts/BarChart';
import { LineChart } from '@/components/charts/LineChart';
import { ActivityChart } from '@/components/charts/ActivityChart';
import type { ReachEdge, ReachNode } from '@/mocks/types';
import { DocCard, Section } from './doc-primitives';

const DEMO_NODES: ReachNode[] = [
  { id: 'o', identityId: 'o', label: 'origin', kind: 'origin' },
  { id: 'd1', identityId: 'd1', label: 'svc-a', kind: 'direct' },
  { id: 'd2', identityId: 'd2', label: 'svc-b', kind: 'direct' },
  { id: 't1', identityId: 't1', label: 'key-x', kind: 'transitive' },
  { id: 'c1', identityId: 'c1', label: 'agent-z', kind: 'cascade' },
];
const DEMO_EDGES: ReachEdge[] = [
  { from: 'o', to: 'd1', kind: 'direct' },
  { from: 'o', to: 'd2', kind: 'direct' },
  { from: 'd1', to: 't1', kind: 'transitive' },
  { from: 'd2', to: 'c1', kind: 'cascade' },
];

const ACTIVITY_DATA = [
  { t: '2026-06-01', discovered: 120, alerts: 8 },
  { t: '2026-06-02', discovered: 180, alerts: 12 },
  { t: '2026-06-03', discovered: 150, alerts: 6 },
  { t: '2026-06-04', discovered: 240, alerts: 18 },
  { t: '2026-06-05', discovered: 210, alerts: 9 },
  { t: '2026-06-06', discovered: 300, alerts: 22 },
  { t: '2026-06-07', discovered: 260, alerts: 14 },
];

const CHART_DATA = [
  { day: 'Mon', agents: 32, keys: 18 },
  { day: 'Tue', agents: 40, keys: 22 },
  { day: 'Wed', agents: 28, keys: 30 },
  { day: 'Thu', agents: 51, keys: 19 },
  { day: 'Fri', agents: 42, keys: 25 },
  { day: 'Sat', agents: 30, keys: 14 },
  { day: 'Sun', agents: 38, keys: 21 },
];

export function VizSection() {
  return (
    <Section id="viz" title="Visualization" description="Bespoke SVG graphics themed to the tokens.">
      <div className="grid gap-4 lg:grid-cols-2">
        <DocCard
          title="Activity chart"
          description="Discovery and alert volume over time."
          className="lg:col-span-2"
          usage="Dashboard trend of identities discovered vs. alerts raised; discovery uses the accent, alerts the warning tone."
          a11y="Pair with a data-table fallback for the accessible summary."
        >
          <div className="h-[240px]">
            <ActivityChart data={ACTIVITY_DATA} />
          </div>
        </DocCard>
        <DocCard
          title="Radial reachability graph"
          description="Direct / transitive / cascade reach."
          usage="Blast-radius view for an origin identity; hops are colored by reach kind."
          a11y="Nodes are focusable and labeled; the legend explains each reach kind."
        >
          <RadialGraph nodes={DEMO_NODES} edges={DEMO_EDGES} visibleKinds={new Set(['origin', 'direct', 'transitive', 'cascade'])} />
        </DocCard>
        <DocCard
          title="Sparklines"
          description="Axis-free trend lines for tiles and inline metrics."
          bodyClassName="space-y-3"
          usage="Compact trend context inside KPI tiles and table rows; pass a stroke to encode direction."
        >
          <Sparkline values={[5, 6, 4, 7, 8, 6, 9, 11, 10, 12]} width={280} height={48} />
          <Sparkline values={[12, 9, 10, 7, 8, 6, 5, 4, 3, 2]} width={280} height={48} stroke="var(--risk-high)" />
        </DocCard>
        <DocCard
          title="Bar chart"
          description="Categorical comparison, themed to the data-viz palette."
          usage="Compare a few categories or series; the categorical palette keeps red reserved for risk."
        >
          <BarChart
            data={CHART_DATA}
            xKey="day"
            series={[{ key: 'agents', label: 'Agents', color: 'var(--cat-1)' }, { key: 'keys', label: 'Keys', color: 'var(--cat-2)' }]}
          />
        </DocCard>
        <DocCard
          title="Line chart"
          description="Multi-series trend over time."
          usage="Trends over a time axis; pair series colors from the categorical palette."
        >
          <LineChart
            data={CHART_DATA}
            xKey="day"
            series={[{ key: 'agents', label: 'Agents', color: 'var(--cat-1)' }, { key: 'keys', label: 'Keys', color: 'var(--cat-3)' }]}
          />
        </DocCard>
      </div>
    </Section>
  );
}
