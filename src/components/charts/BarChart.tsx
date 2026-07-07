import {
  Bar,
  BarChart as RBarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from 'recharts';

export interface BarSeries {
  key: string;
  label: string;
  color: string;
}

const AXIS_TICK = { fill: 'var(--text-tertiary)', fontSize: 11 };

/** A themed bar chart. Pass token color vars (e.g. var(--cat-1)) for each series. */
export function BarChart<T extends Record<string, unknown>>({
  data,
  xKey,
  series,
  height = 240,
}: {
  data: T[];
  xKey: string;
  series: BarSeries[];
  height?: number;
}) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RBarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid stroke="var(--grid-line)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey={xKey} tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: 'var(--border)' }} />
          <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={40} />
          <RTooltip
            cursor={{ fill: 'var(--surface-hover)' }}
            contentStyle={{
              background: 'var(--surface-2)',
              border: '1px solid var(--border-strong)',
              borderRadius: 8,
              fontSize: 12,
              color: 'var(--text-primary)',
            }}
          />
          {series.map((s) => (
            <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={[3, 3, 0, 0]} isAnimationActive={false} />
          ))}
        </RBarChart>
      </ResponsiveContainer>
    </div>
  );
}
