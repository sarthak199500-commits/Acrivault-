import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownRight, ArrowRight, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { compact } from '@/lib/format';
import { Sparkline } from './Sparkline';

export interface KpiTileProps {
  label: string;
  /** Number (compact-formatted) or a pre-formatted string (e.g. "6.3%", "6 min ago"). */
  value: number | string;
  /** Optional signed delta vs a prior period. */
  delta?: number;
  deltaLabel?: string;
  /** When true, an upward delta is unfavorable (warn) and down is good — for "lower is better" metrics. */
  deltaInverted?: boolean;
  sparkline?: number[];
  icon?: ReactNode;
  /** When set, the whole tile is a link (drill-down with a filter applied). */
  to?: string;
  /** Visually lead this tile (AI agents are the most prominent type). */
  prominent?: boolean;
  /**
   * Mark a tile as carrying risk. Per the "color appears only where there is risk"
   * principle, this is the one place a KPI earns color: the icon and value take the
   * critical tone so the security signal lands first.
   */
  risk?: 'critical';
}

export function KpiTile({
  label,
  value,
  delta,
  deltaLabel,
  deltaInverted = false,
  sparkline,
  icon,
  to,
  prominent,
  risk,
}: KpiTileProps) {
  const deltaDir = delta === undefined ? 'flat' : delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
  const DeltaIcon = deltaDir === 'up' ? ArrowUpRight : deltaDir === 'down' ? ArrowDownRight : ArrowRight;
  // Favorable direction depends on the metric: for most, up is good; for
  // "lower is better" metrics (risk, drift), invert so up reads as a warning.
  const favorable = deltaDir === 'flat' ? 'flat' : deltaInverted === (deltaDir === 'up') ? 'down' : 'up';
  const deltaTone =
    favorable === 'up' ? 'text-ok-fg' : favorable === 'down' ? 'text-warn-fg' : 'text-text-tertiary';

  const valueText = typeof value === 'number' ? compact(value) : value;
  const valueAria = typeof value === 'number' ? value.toLocaleString() : value;
  // Fold the trend into the accessible name so a screen-reader user hears the
  // direction without relying on the arrow glyph.
  const trendAria =
    delta !== undefined && deltaDir !== 'flat'
      ? `, ${deltaDir === 'up' ? 'up' : 'down'} ${Math.abs(delta)}${deltaLabel ? ` ${deltaLabel}` : ''}`
      : '';

  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="text-[length:var(--fs-small)] text-text-secondary">{label}</span>
        {icon ? (
          <span
            className={cn(
              'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--r-sm)]',
              // Theme split lives in the --chip-* tokens: calm muted chips on
              // dark, solid brand/critical fills with a white glyph on light.
              risk
                ? 'bg-chip-risk text-chip-risk-fg'
                : prominent
                  ? 'bg-chip-prominent text-chip-prominent-fg'
                  : 'bg-chip text-chip-fg',
            )}
          >
            {icon}
          </span>
        ) : (
          to && (
            <ArrowRight
              className="h-4 w-4 text-text-tertiary opacity-0 transition-opacity group-hover:opacity-100"
              aria-hidden="true"
            />
          )
        )}
      </div>

      <div className="mt-auto flex items-end justify-between gap-3 pt-3">
        <div>
          <div
            className={cn(
              'tnum font-semibold tracking-tight',
              risk ? 'text-[var(--crit-fg)]' : 'text-text',
              prominent
                ? 'text-[32px] leading-9'
                : 'text-[length:var(--fs-display)] leading-[var(--lh-display)]',
            )}
          >
            {valueText}
          </div>
          {delta !== undefined && (
            <div className={cn('mt-1 inline-flex items-center gap-1 whitespace-nowrap text-[length:var(--fs-micro)]', deltaTone)}>
              <DeltaIcon className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span className="tnum">{Math.abs(delta)}</span>
              {deltaLabel && <span className="text-text-tertiary">{deltaLabel}</span>}
            </div>
          )}
        </div>
        {sparkline && sparkline.length > 1 && (
          <Sparkline
            values={sparkline}
            stroke={prominent ? 'var(--accent-300)' : 'var(--text-tertiary)'}
            ariaLabel={`${label} trend`}
            // Only show once the tile is wide enough to hold the value, delta,
            // and sparkline without crowding. Column count shifts per breakpoint,
            // so gate on the tile's own width (@container) not the viewport.
            className="hidden shrink-0 @min-[200px]:block"
          />
        )}
      </div>
    </>
  );

  const baseClass = cn(
    'group @container flex h-full flex-col rounded-[var(--r-lg)] border bg-surface p-4 text-left transition-colors',
    prominent ? 'border-border-strong' : 'border-border',
    // Hover is theme-split via --surface-hover-brand: dark lightens the
    // surface; light shows a soft brand whisper (gray muddied the paper card).
    to && 'hover:border-border-strong focus-visible:border-accent hover:bg-surface-hover-brand',
  );

  if (to) {
    return (
      <Link to={to} className={baseClass} aria-label={`${label}: ${valueAria}${trendAria}. View details.`}>
        {body}
      </Link>
    );
  }
  return <div className={baseClass}>{body}</div>;
}
