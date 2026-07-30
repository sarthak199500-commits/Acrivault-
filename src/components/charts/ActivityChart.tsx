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
 *
 * Rendered as two stacked panels sharing an x axis, not two series on one y axis.
 * Discovery runs ~18-36/day and alerts ~1-9, so on a shared scale the alerts line
 * collapsed into the bottom quarter and read as a flat wiggle — the series that
 * matters most on a security console was the one you could not read. Each panel
 * now scales to its own series. Small multiples rather than a dual axis on
 * purpose: a second y axis lets any two shapes be aligned to imply a correlation
 * that is not in the data.
 */
export function ActivityChart({ data }: { data: ActivityPoint[] }) {
  return (
    <div className="flex h-full min-h-[220px] w-full flex-col">
      {/* Discovered — the taller panel; this is the volume story. */}
      <div className="min-h-0 flex-[3]">
        <ActivityPanel data={data} series="discovered" showXAxis={false} />
      </div>
      {/* Alerts — its own scale, so 1-9 uses the full height it is given. */}
      <div className="min-h-0 flex-[2]">
        <ActivityPanel data={data} series="alerts" showXAxis />
      </div>
    </div>
  );
}

function ActivityPanel({
  data,
  series,
  showXAxis,
}: {
  data: ActivityPoint[];
  series: 'discovered' | 'alerts';
  showXAxis: boolean;
}) {
  const isDiscovered = series === 'discovered';
  const stroke = isDiscovered ? 'var(--accent)' : 'var(--warning)';
  return (
    <div className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 8, right: 8, bottom: showXAxis ? 0 : 4, left: -16 }}
        >
          <defs>
            <linearGradient id={`acv-fill-${series}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.28} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--grid-line)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="t"
            hide={!showXAxis}
            /* Every day is labelled, as a bare day number.
             *
             * Originally each tick read "Jul 16" (~34px), so all 14 could not fit the
             * card width and Recharts' default `preserveEnd` dropped one beside the
             * force-included last tick — a date that looked missing. Month-on-the-first
             * -tick fixed that but made one label 3x wider than its ~21px slot, so it
             * collided with the Y axis's "0" and touched the next label. Uniform day
             * numbers fit all 14 down to ~300px with even gaps and no collisions; the
             * month is carried by the card description instead. `tickMargin` drops the
             * row clear of the Y axis's zero label at the bottom-left corner. */
            tickFormatter={(v: string) => String(new Date(v).getDate())}
            tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: 'var(--border)' }}
            interval={0}
            tickMargin={8}
          />
          <YAxis
            tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={40}
            // Few ticks: each panel is short, and the point is the shape, not precision.
            tickCount={isDiscovered ? 3 : 2}
            allowDecimals={false}
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
            dataKey={series}
            name={isDiscovered ? 'Discovered' : 'Alerts'}
            stroke={stroke}
            strokeWidth={isDiscovered ? 2 : 1.5}
            fill={`url(#acv-fill-${series})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
