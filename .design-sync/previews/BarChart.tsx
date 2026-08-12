import { BarChart } from 'acrivault';

/* recharts ResponsiveContainer for width → needs a sized-width parent; height is
 * a prop (default 240). Colors come from the categorical palette (--cat-*), which
 * keeps red reserved for risk. */
const DATA = [
  { day: 'Mon', agents: 32, keys: 18 },
  { day: 'Tue', agents: 40, keys: 22 },
  { day: 'Wed', agents: 28, keys: 30 },
  { day: 'Thu', agents: 51, keys: 19 },
  { day: 'Fri', agents: 42, keys: 25 },
  { day: 'Sat', agents: 30, keys: 14 },
  { day: 'Sun', agents: 38, keys: 21 },
];

/** Two categorical series (agents vs. keys) across a week. */
export function TwoSeries() {
  return (
    <div style={{ background: 'var(--bg)', borderRadius: 'var(--r-md)', padding: 20, maxWidth: 460 }}>
      <BarChart
        data={DATA}
        xKey="day"
        series={[
          { key: 'agents', label: 'Agents', color: 'var(--cat-1)' },
          { key: 'keys', label: 'Keys', color: 'var(--cat-2)' },
        ]}
      />
    </div>
  );
}

/** A single series reads as a clean categorical comparison. */
export function SingleSeries() {
  return (
    <div style={{ background: 'var(--bg)', borderRadius: 'var(--r-md)', padding: 20, maxWidth: 460 }}>
      <BarChart
        data={DATA}
        xKey="day"
        height={180}
        series={[{ key: 'agents', label: 'New agents', color: 'var(--cat-1)' }]}
      />
    </div>
  );
}
