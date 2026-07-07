import { cn } from '@/lib/cn';

export type DotTone = 'ok' | 'warn' | 'crit' | 'info' | 'neutral';

const TONES: Record<DotTone, string> = {
  ok: 'bg-[var(--success)]',
  warn: 'bg-[var(--warning)]',
  crit: 'bg-[var(--critical)]',
  info: 'bg-[var(--info)]',
  neutral: 'bg-[var(--text-tertiary)]',
};

/** A small status indicator. Always paired with a text label by the caller. */
export function StatusDot({
  tone = 'neutral',
  pulse = false,
  className,
}: {
  tone?: DotTone;
  pulse?: boolean;
  className?: string;
}) {
  return (
    <span className={cn('relative inline-flex h-2 w-2 shrink-0', className)} aria-hidden="true">
      {pulse && (
        <span
          className={cn('absolute inline-flex h-full w-full rounded-full opacity-60 motion-safe:animate-ping', TONES[tone])}
        />
      )}
      <span className={cn('relative inline-flex h-2 w-2 rounded-full', TONES[tone])} />
    </span>
  );
}
