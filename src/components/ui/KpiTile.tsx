import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownRight, ArrowRight, ArrowUpRight, Info } from 'lucide-react';
import { cn } from '@/lib/cn';
import { count } from '@/lib/format';
import { Popover, PopoverContent, PopoverTrigger } from './Popover';
import { Sparkline } from './Sparkline';

export interface KpiTileProps {
  label: string;
  /** Number (exact, grouped) or a pre-formatted string (e.g. "6.3%", "6 min ago"). */
  value: number | string;
  /** Optional signed delta vs a prior period. */
  delta?: number;
  deltaLabel?: string;
  /**
   * Static qualifier shown under the value when there is no `delta` — e.g. a share
   * of a whole. Not a trend: no arrow, no favourable/unfavourable colour.
   */
  caption?: ReactNode;
  /**
   * Methodology behind a derived figure, shown in a popover from the tile's icon
   * chip. Any tile printing a computed percentage should carry one — an
   * unexplained percentage is the first thing challenged in a security review.
   */
  info?: ReactNode;
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
  caption,
  info,
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

  // Exact grouped integers, not compact ("1,500" not "1.5K"). These figures are
  // read in a compliance context, where a rounded headline that disagrees with the
  // per-type breakdown below it reads as a reconciliation bug. The `.tnum` utility
  // on the value element keeps digits tabular.
  const valueText = typeof value === 'number' ? count(value) : value;
  const valueAria = typeof value === 'number' ? value.toLocaleString() : value;
  // Fold the trend into the accessible name so a screen-reader user hears the
  // direction without relying on the arrow glyph.
  const trendAria =
    delta !== undefined && deltaDir !== 'flat'
      ? `, ${deltaDir === 'up' ? 'up' : 'down'} ${Math.abs(delta)}${deltaLabel ? ` ${deltaLabel}` : ''}`
      : '';

  const chipClass = cn(
    'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--r-sm)]',
    // Theme split lives in the --chip-* tokens: calm muted chips on
    // dark, solid brand/critical fills with a white glyph on light.
    risk
      ? 'bg-chip-risk text-chip-risk-fg'
      : prominent
        ? 'bg-chip-prominent text-chip-prominent-fg'
        : 'bg-chip text-chip-fg',
  );

  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="text-[length:var(--fs-small)] text-text-secondary">{label}</span>
        {icon ? (
          // With `info`, this chip is only a placeholder holding the slot open:
          // the real control is a button rendered OUTSIDE the tile's link, since
          // a button inside a link is an invalid nested interactive.
          <span className={cn(chipClass, info && 'invisible')} aria-hidden={info ? true : undefined}>
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
          {delta !== undefined ? (
            <div className={cn('mt-1 inline-flex items-center gap-1 whitespace-nowrap text-[length:var(--fs-micro)]', deltaTone)}>
              <DeltaIcon className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span className="tnum">{Math.abs(delta)}</span>
              {deltaLabel && <span className="text-text-tertiary">{deltaLabel}</span>}
            </div>
          ) : caption ? (
            // Neutral secondary text in the slot the delta would occupy, for a static
            // qualifier like "41% of total". Distinct from `delta`, which carries a
            // direction arrow and a favourable/unfavourable tone — a share is neither
            // good nor bad, so it stays tertiary and plain.
            <div className="mt-1 flex h-5 items-center whitespace-nowrap text-[length:var(--fs-micro)] text-text-tertiary">
              {caption}
            </div>
          ) : (
            // Reserve the delta line's height (matches the row above) so a tile
            // without a delta keeps its value on the same baseline as tiles that
            // have one, instead of dropping to the card's bottom edge.
            <div className="mt-1 h-5" aria-hidden="true" />
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

  const tile = to ? (
    <Link to={to} className={baseClass} aria-label={`${label}: ${valueAria}${trendAria}. View details.`}>
      {body}
    </Link>
  ) : (
    <div className={baseClass}>{body}</div>
  );

  if (!info) return tile;

  return (
    <div className="relative h-full">
      {tile}
      {/* Sits exactly over the placeholder chip in `body`. Kept a sibling of the
          tile rather than a child so the drill-down link and the methodology
          control never nest. `top-4 right-4` mirrors the tile's own p-4. */}
      <div className="absolute right-4 top-4">
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={`How ${label} is measured`}
              className={cn(
                chipClass,
                'outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--accent)_35%,transparent)]',
              )}
            >
              <Info className="h-4 w-4" aria-hidden="true" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" ariaLabel={`How ${label} is measured`} className="w-72">
            {info}
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
