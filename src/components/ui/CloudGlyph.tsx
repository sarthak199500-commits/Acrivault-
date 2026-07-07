import type { Cloud } from '@/mocks/types';
import { cn } from '@/lib/cn';

const ABBR: Record<Cloud, string> = { aws: 'AWS', gcp: 'GCP', azure: 'AZ' };

/**
 * A compact, monochrome cloud marker. Deliberately neutral — the resting UI is
 * near-monochrome and color is reserved for risk, so clouds read as text chips.
 */
export function CloudGlyph({ cloud, className }: { cloud: Cloud; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center rounded-[var(--r-xs)] border border-border bg-surface-2 px-1',
        'font-mono text-[length:var(--fs-micro)] font-medium text-text-secondary',
        className,
      )}
      title={cloud.toUpperCase()}
    >
      {ABBR[cloud]}
    </span>
  );
}
