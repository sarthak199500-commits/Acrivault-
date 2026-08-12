import { useState } from 'react';
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
import { cn } from '@/lib/cn';

export interface ActivityPoint {
  t: string;
  discovered: number;
  alerts: number;
}

type Series = 'discovered' | 'alerts';

/** The slice of Recharts' chart state this component reads on hover. */
interface ChartMouseState {
  isTooltipActive?: boolean;
  activeTooltipIndex?: number;
  activeCoordinate?: { x: number; y: number };
}

/**
 * The two panels, in render order. Held as data because the tooltip lists both
 * series and each panel renders one — a single source keeps the label and the
 * colour used in both places from drifting apart.
 *
 * `flex` is the height share: discovery is the volume story and gets the taller
 * panel; alerts needs less room to show a 1-9 shape.
 */
const PANELS = [
  { key: 'discovered', label: 'Discovered', color: 'var(--accent)', flex: 3, strokeWidth: 2 },
  { key: 'alerts', label: 'Alerts', color: 'var(--warning)', flex: 2, strokeWidth: 1.5 },
] as const satisfies readonly {
  key: Series;
  label: string;
  color: string;
  flex: number;
  strokeWidth: number;
}[];

/* Fixed chrome inside each panel, in px, reserved as flex-basis so that `flex`
 * above divides *plot* height rather than panel height.
 *
 * Without this the bottom panel paid for the shared x axis out of its own share:
 * at a 220px card the alerts plot came out ~30px against discovery's ~107, so the
 * series the split exists to make readable was squeezed to a third of its intended
 * height. Reserving the band first makes the panels 3:2 where it counts. */
const LABEL_ROW_PX = 16;
const X_AXIS_BAND_PX = 34;

/**
 * Discovery + alert volume over time, as two stacked panels sharing one x axis.
 *
 * Small multiples, not two series on one y axis. Discovery runs ~18-36/day and
 * alerts ~1-9, so on a shared scale the alerts line collapsed into the bottom
 * quarter and read as a flat wiggle — the series that matters most on a security
 * console was the one you could not read. Each panel scales to its own series. A
 * second y axis is deliberately not the answer: it lets any two shapes be aligned
 * to imply a correlation that is not in the data.
 *
 * The cost of splitting is that the two y axes stack into one column, and that
 * column used to read as a single broken scale — "40, 20, 9, 0" — because the top
 * panel never drew its zero and nothing marked where one axis ended and the next
 * began. Three things separate them now: each panel states its own series name
 * above its plot, each axis draws an explicit zero, and a rule runs between the
 * panels.
 */
export function ActivityChart({ data }: { data: ActivityPoint[] }) {
  /* The hovered day, and where it sits horizontally.
   *
   * The readout is positioned by this component rather than by Recharts, which is a
   * deliberate reversal of the obvious approach. Recharts' own tooltip is anchored
   * to the data point and will happily hang past the bottom of the card; because it
   * is out of flow it adds no layout height but still counts toward the scrollable
   * overflow of the dashboard's `overflow-y-auto` column, so hovering the lower
   * panel made a second scrollbar appear and reflowed the page. Both ways of
   * reining that in from the inside failed: `allowEscapeViewBox` only moves where
   * it overflows, and absolutely positioning the content collapses the wrapper to
   * 0x0 — which Recharts measures to compute its transform, so the box stops
   * following the pointer and parks at the chart origin.
   *
   * Recharts still owns the crosshair (`syncId` draws it in both panels at the same
   * index, so a day can be traced from discovery down to alerts). It just no longer
   * owns where the box goes. */
  const [active, setActive] = useState<{ index: number; x: number; panel: Series } | null>(null);
  const point = active ? data[active.index] : undefined;

  return (
    <div className="relative flex h-full min-h-[220px] w-full flex-col">
      {PANELS.map((panel, i) => {
        const isLast = i === PANELS.length - 1;
        return (
          <div
            key={panel.key}
            className={cn(
              'flex min-h-0 flex-col',
              // The rule is the visual break between the two y axes.
              i > 0 && 'mt-1 border-t border-border pt-1',
            )}
            style={{
              flexGrow: panel.flex,
              flexShrink: 1,
              flexBasis: LABEL_ROW_PX + (isLast ? X_AXIS_BAND_PX : 0),
            }}
          >
            {/* Names the panel's own series, so neither the shared legend nor the
              colour is load-bearing for telling the two plots apart. Indented past
              the y axis gutter to sit over the plot rather than the tick column. */}
            <div className="flex items-center gap-1.5 pl-6 text-[length:var(--fs-micro)] text-text-secondary">
              <span
                className="h-0.5 w-3.5 rounded-full"
                style={{ background: panel.color }}
                aria-hidden="true"
              />
              {panel.label}
            </div>
            <div className="min-h-0 flex-1">
              <ActivityPanel data={data} panel={panel} showXAxis={isLast} onActive={setActive} />
            </div>
          </div>
        );
      })}
      {point && active && <ActivityTooltip point={point} active={active} total={data.length} />}
    </div>
  );
}

/**
 * Round an axis up to a readable top. Explicit ticks rather than Recharts'
 * generator: at `tickCount={3}` on the discovery domain it emitted 20 and 40 and
 * silently dropped the zero, which is what let the stacked axes read as one scale.
 * `step` is chosen per panel so the midpoint is a whole number.
 */
function axisTop(max: number, step: number): number {
  return Math.max(step, Math.ceil(max / step) * step);
}

function ActivityPanel({
  data,
  panel,
  showXAxis,
  onActive,
}: {
  data: ActivityPoint[];
  panel: (typeof PANELS)[number];
  showXAxis: boolean;
  onActive: (a: { index: number; x: number; panel: Series } | null) => void;
}) {
  const { key: series, label, color: stroke } = panel;
  const isDiscovered = series === 'discovered';
  const max = data.reduce((n, d) => Math.max(n, d[series]), 0);
  // Discovery steps by 10 so its midpoint tick is whole; alerts by 3 so a 1-9
  // series tops out at exactly 9 rather than a padded 10.
  const top = axisTop(max, isDiscovered ? 10 : 3);
  const ticks = isDiscovered ? [0, top / 2, top] : [0, top];

  return (
    <div className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          /* Shared hover index across both panels — this is what lets the crosshair
             in one panel line up with the same day in the other. */
          syncId="acv-activity"
          margin={{ top: 4, right: 8, bottom: showXAxis ? 0 : 4, left: -16 }}
          /* Only the panel actually under the pointer fires these — `syncId`
             propagates Recharts' internal active index, not DOM events — so this
             doubles as "which panel is hovered". `activeCoordinate.x` is in the
             svg's space, and every panel spans the full width of this component
             with no horizontal padding, so it maps straight onto the container. */
          onMouseMove={(s: ChartMouseState) => {
            if (s?.isTooltipActive && s.activeTooltipIndex != null && s.activeCoordinate)
              onActive({ index: s.activeTooltipIndex, x: s.activeCoordinate.x, panel: series });
          }}
          onMouseLeave={() => onActive(null)}
        >
          <defs>
            <linearGradient id={`acv-fill-${series}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.28} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0} />
            </linearGradient>
          </defs>
          {/* Solid hairline. Dashing reads as "projection" or "threshold" when it is
              only a grid, and this card now carries more chrome than it did. */}
          <CartesianGrid stroke="var(--grid-line)" vertical={false} />
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
            domain={[0, top]}
            ticks={ticks}
            /* Forces every tick in `ticks` to render. Recharts' default
               `preserveEnd` drops a tick whose label would cross the axis
               boundary, and the zero tick sits exactly on that boundary — which is
               why both panels silently lost their zero and the stacked axes read as
               one scale. The x axis already relies on the same escape hatch. */
            interval={0}
            allowDecimals={false}
          />
          {/* Kept for the crosshair alone — `syncId` draws it in both panels, so the
              hovered day lines up across the pair. The box itself is rendered by
              ActivityChart; content returning null leaves an empty wrapper that
              cannot overflow anything. */}
          <RTooltip
            cursor={{ stroke: 'var(--text-tertiary)', strokeWidth: 1 }}
            content={() => null}
          />
          <Area
            type="monotone"
            dataKey={series}
            name={label}
            stroke={stroke}
            strokeWidth={panel.strokeWidth}
            fill={`url(#acv-fill-${series})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * One readout for both series, so a hover anywhere answers "what happened that
 * day" rather than "what did this one panel do". Values lead and labels follow —
 * the reader already knows which series they came for and wants the number. Series
 * are keyed by a short stroke of their colour; the text stays in text tokens so
 * colour is never the only thing carrying identity.
 *
 * Positioned against the chart box, never the data point, so it cannot leave the
 * card — which is what made the page grow a second scrollbar when Recharts placed
 * it. Two rules, both edge-free by construction:
 *
 *  - Vertically it parks on the panel the pointer is in: top of the chart for
 *    discovery, above the x axis band for alerts. It briefly did the opposite, on
 *    the theory that a readout should never cover the line being read — which was
 *    wrong, because it put the answer where the reader was not looking. The 12px
 *    horizontal offset already keeps the box off the hovered point itself, so all
 *    it ever covers is a neighbouring day's line.
 *  - Horizontally it follows the day but switches from left- to right-anchored past
 *    the midpoint, so neither end can run off. Anchoring by percentage means the
 *    container's width never has to be measured.
 *
 * Both resting places are inside the chart at any height the card can take, so
 * neither can reach the card edge.
 */
function ActivityTooltip({
  point,
  active,
  total,
}: {
  point: ActivityPoint;
  active: { index: number; x: number; panel: Series };
  total: number;
}) {
  const nearRight = active.index > (total - 1) / 2;
  return (
    <div
      className="pointer-events-none absolute z-10 rounded-[var(--r-lg)] border border-border-strong bg-surface-2 px-2.5 py-2 shadow-[var(--shadow-md)]"
      style={{
        ...(nearRight ? { right: `calc(100% - ${active.x - 12}px)` } : { left: active.x + 12 }),
        // On the hovered panel. The alerts seat clears the x axis band beneath it.
        ...(active.panel === 'alerts' ? { bottom: X_AXIS_BAND_PX } : { top: 0 }),
      }}
    >
      <div className="mb-1 text-[length:var(--fs-micro)] text-text-tertiary">{date(point.t)}</div>
      {PANELS.map((panel) => (
        <div key={panel.key} className="flex items-baseline gap-2">
          <span
            className="h-0.5 w-3 shrink-0 rounded-full"
            style={{ background: panel.color }}
            aria-hidden="true"
          />
          <span className="text-[length:var(--fs-small)] font-medium tabular-nums text-text">
            {point[panel.key]}
          </span>
          <span className="text-[length:var(--fs-micro)] text-text-secondary">{panel.label}</span>
        </div>
      ))}
    </div>
  );
}
