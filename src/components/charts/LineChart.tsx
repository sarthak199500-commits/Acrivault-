import {
  CartesianGrid,
  Line,
  LineChart as RLineChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from 'recharts';

export interface LineSeries {
  key: string;
  label: string;
  color: string;
}

const AXIS_TICK = { fill: 'var(--text-tertiary)', fontSize: 11 };

/** A themed multi-series line chart. */
export function LineChart<T extends Record<string, unknown>>({
  data,
  xKey,
  series,
  height = 240,
}: {
  data: T[];
  xKey: string;
  series: LineSeries[];
  height?: number;
}) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RLineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid stroke="var(--grid-line)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey={xKey} tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: 'var(--border)' }} minTickGap={24} />
          <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={40} />
          <RTooltip
            contentStyle={{
              background: 'var(--surface-2)',
              border: '1px solid var(--border-strong)',
              borderRadius: 8,
              fontSize: 12,
              color: 'var(--text-primary)',
            }}
          />
          {series.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.color}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          ))}
        </RLineChart>
      </ResponsiveContainer>
    </div>
  );
}
