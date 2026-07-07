import { useId } from 'react';
import { line as d3line, area as d3area, curveMonotoneX } from 'd3-shape';
import { scaleLinear } from 'd3-scale';
import { cn } from '@/lib/cn';

/** A tiny, axis-free trend line for KPI tiles and inline metrics. */
export function Sparkline({
  values,
  width = 96,
  height = 28,
  stroke = 'var(--accent-300)',
  fill = true,
  className,
  ariaLabel,
}: {
  values: number[];
  width?: number;
  height?: number;
  stroke?: string;
  fill?: boolean;
  className?: string;
  ariaLabel?: string;
}) {
  const gradId = useId();
  if (values.length < 2) return <svg width={width} height={height} className={className} />;

  const pad = 2;
  const x = scaleLinear()
    .domain([0, values.length - 1])
    .range([pad, width - pad]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const y = scaleLinear()
    .domain([min, max === min ? min + 1 : max])
    .range([height - pad, pad]);

  const linePath = d3line<number>()
    .x((_, i) => x(i))
    .y((d) => y(d))
    .curve(curveMonotoneX)(values);

  const areaPath = d3area<number>()
    .x((_, i) => x(i))
    .y0(height - pad)
    .y1((d) => y(d))
    .curve(curveMonotoneX)(values);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn('overflow-visible', className)}
      role="img"
      aria-label={ariaLabel ?? 'Trend sparkline'}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.22" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      {fill && areaPath && <path d={areaPath} fill={`url(#${gradId})`} />}
      {linePath && <path d={linePath} fill="none" stroke={stroke} strokeWidth={1.5} strokeLinecap="round" />}
    </svg>
  );
}
