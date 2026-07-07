import { type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { count as fmtCount } from '@/lib/format';
import { ProgressBar } from './ProgressBar';

export interface ScanRow {
  id: string;
  label: string;
  icon?: ReactNode;
  value: number;
  total: number;
}

/**
 * A multi-row scan progress display: per-category bars with live counts and a
 * running total. Used by onboarding's discovery scan.
 */
export function ScanProgress({
  rows,
  scanning,
  className,
}: {
  rows: ScanRow[];
  scanning?: boolean;
  className?: string;
}) {
  const total = rows.reduce((sum, r) => sum + r.value, 0);

  return (
    <div className={cn('space-y-3', className)} aria-live="polite" aria-busy={scanning || undefined}>
      <div className="flex items-center justify-between">
        <span className="eyebrow">{scanning ? 'Discovering…' : 'Discovered'}</span>
        <span className="tnum text-[length:var(--fs-h2)] font-semibold text-text">{fmtCount(total)}</span>
      </div>
      <ul className="space-y-2.5">
        {rows.map((row) => (
          <li key={row.id} className="flex items-center gap-3">
            <span className="flex w-44 items-center gap-2 text-[length:var(--fs-small)] text-text-secondary">
              {row.icon && <span className="text-text-tertiary" aria-hidden="true">{row.icon}</span>}
              {row.label}
            </span>
            <ProgressBar value={row.value} max={row.total} size="sm" className="flex-1" />
            <span className="tnum w-12 text-right text-[length:var(--fs-small)] text-text">{fmtCount(row.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
