import { cn } from '@/lib/cn';

/** An accessible progress bar. Omit `value` for an indeterminate state. */
export function ProgressBar({
  value,
  max = 100,
  label,
  tone = 'accent',
  size = 'md',
  className,
}: {
  value?: number;
  max?: number;
  label?: string;
  tone?: 'accent' | 'success' | 'warning' | 'critical';
  size?: 'sm' | 'md';
  className?: string;
}) {
  const indeterminate = value === undefined;
  const pct = indeterminate ? 0 : Math.max(0, Math.min(100, (value / max) * 100));
  const toneColor = {
    accent: 'var(--accent)',
    success: 'var(--success)',
    warning: 'var(--warning)',
    critical: 'var(--critical)',
  }[tone];

  return (
    <div className={className}>
      {label && (
        <div className="mb-1 flex items-center justify-between text-[length:var(--fs-small)]">
          <span className="text-text-secondary">{label}</span>
          {!indeterminate && <span className="tnum text-text-tertiary">{Math.round(pct)}%</span>}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={indeterminate ? undefined : Math.round(value)}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label ?? 'Progress'}
        className={cn('w-full overflow-hidden rounded-full bg-surface-2', size === 'sm' ? 'h-1.5' : 'h-2')}
      >
        <div
          className={cn('h-full rounded-full transition-[width] duration-[var(--dur-3)]', indeterminate && 'w-1/3 motion-safe:animate-[acv-indeterminate_1.4s_ease-in-out_infinite]')}
          style={{ width: indeterminate ? undefined : `${pct}%`, backgroundColor: toneColor }}
        />
      </div>
    </div>
  );
}
