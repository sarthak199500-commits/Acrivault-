import { LineChart } from 'acrivault';

/* recharts ResponsiveContainer for width → needs a sized-width parent; height is
 * a prop (default 240). Series colors pair from the categorical palette. */
const DATA = [
  { day: 'Mon', agents: 32, keys: 18 },
  { day: 'Tue', agents: 40, keys: 22 },
  { day: 'Wed', agents: 28, keys: 30 },
  { day: 'Thu', agents: 51, keys: 19 },
  { day: 'Fri', agents: 42, keys: 25 },
  { day: 'Sat', agents: 30, keys: 14 },
  { day: 'Sun', agents: 38, keys: 21 },
];

/** Two series trended over a time axis. */
export function TwoSeries() {
  return (
    <div style={{ background: 'var(--bg)', borderRadius: 'var(--r-md)', padding: 20, maxWidth: 460 }}>
      <LineChart
        data={DATA}
        xKey="day"
        series={[
          { key: 'agents', label: 'Agents', color: 'var(--cat-1)' },
          { key: 'keys', label: 'Keys', color: 'var(--cat-3)' },
        ]}
      />
    </div>
  );
}

/** A single trend line — the compact form for one metric over time. */
export function SingleSeries() {
  return (
    <div style={{ background: 'var(--bg)', borderRadius: 'var(--r-md)', padding: 20, maxWidth: 460 }}>
      <LineChart
        data={DATA}
        xKey="day"
        height={180}
        series={[{ key: 'agents', label: 'Active agents', color: 'var(--cat-1)' }]}
      />
    </div>
  );
}
