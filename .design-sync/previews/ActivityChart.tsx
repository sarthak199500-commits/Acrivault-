import { ActivityChart } from 'acrivault';

/* ActivityChart uses a recharts ResponsiveContainer (100% × 100%), so it needs a
 * parent with an explicit height AND width or it collapses to nothing. */
const DATA = [
  { t: '2026-06-01', discovered: 120, alerts: 8 },
  { t: '2026-06-02', discovered: 180, alerts: 12 },
  { t: '2026-06-03', discovered: 150, alerts: 6 },
  { t: '2026-06-04', discovered: 240, alerts: 18 },
  { t: '2026-06-05', discovered: 210, alerts: 9 },
  { t: '2026-06-06', discovered: 300, alerts: 22 },
  { t: '2026-06-07', discovered: 260, alerts: 14 },
];

/** Discovery vs. alert volume over a week. Discovery is drawn in the brand
 *  accent, alerts in the warning tone — the dashboard's headline trend. */
export function DiscoveryVsAlerts() {
  return (
    <div style={{ background: 'var(--bg)', borderRadius: 'var(--r-md)', padding: 20 }}>
      <div style={{ height: 240, width: '100%' }}>
        <ActivityChart data={DATA} />
      </div>
    </div>
  );
}
