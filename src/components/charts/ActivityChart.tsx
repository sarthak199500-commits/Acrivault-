import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { date } from '@/lib/format';

export interface ActivityPoint {
  t: string;
  discovered: number;
  alerts: number;
}

/**
 * Discovery + alert volume over time. Calm by default: the discovery series uses
 * the brand accent; alerts use the warning token because they signal attention.
 * A data-table fallback is provided by the caller for the accessible summary.
 */
export function ActivityChart({ data }: { data: ActivityPoint[] }) {
  return (
    <div className="h-full min-h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <defs>
            <linearGradient id="acv-discovered" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.28} />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--grid-line)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="t"
            tickFormatter={(v: string) => date(v).replace(/,.*/, '')}
            tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: 'var(--border)' }}
            minTickGap={24}
          />
          <YAxis
            tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={40}
          />
          <RTooltip
            contentStyle={{
              background: 'var(--surface-2)',
              border: '1px solid var(--border-strong)',
              borderRadius: 8,
              fontSize: 12,
              color: 'var(--text-primary)',
            }}
            labelFormatter={(v: string) => date(v)}
          />
          <Area
            type="monotone"
            dataKey="discovered"
            name="Discovered"
            stroke="var(--accent)"
            strokeWidth={2}
            fill="url(#acv-discovered)"
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="alerts"
            name="Alerts"
            stroke="var(--warning)"
            strokeWidth={1.5}
            fillOpacity={0}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
