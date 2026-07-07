import type { Cloud } from '@/mocks/types';
import { cn } from '@/lib/cn';

// A small, distinct categorical hue per provider (from the colorblind-aware
// data-viz palette). Only the dot carries color; the label stays neutral so the
// resting UI remains calm and the text passes AA in both themes.
export const PROVIDER_COLOR: Record<Cloud, string> = {
  aws: 'var(--cat-4)', // amber
  azure: 'var(--cat-2)', // blue
  gcp: 'var(--cat-3)', // violet
};

export const PROVIDER_LABEL: Record<Cloud, string> = { aws: 'AWS', azure: 'Azure', gcp: 'GCP' };

const DOT = PROVIDER_COLOR;
const LABEL = PROVIDER_LABEL;

/** A provider chip: a colored dot + the provider name. */
export function ProviderBadge({ cloud, className }: { cloud: Cloud; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-[var(--r-sm)] border border-border bg-surface-2 px-1.5 py-0.5',
        'text-[length:var(--fs-small)] font-medium text-text-secondary whitespace-nowrap',
        className,
      )}
      title={LABEL[cloud]}
    >
      <span
        className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: DOT[cloud] }}
        aria-hidden="true"
      />
      {LABEL[cloud]}
    </span>
  );
}
