import { type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'critical' | 'info';

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-neutral-bg text-neutral-fg',
  success: 'bg-ok-bg text-ok-fg',
  warning: 'bg-warn-bg text-warn-fg',
  critical: 'bg-crit-bg text-crit-fg',
  info: 'bg-info-bg text-info-fg',
};

export function Badge({
  tone = 'neutral',
  icon,
  className,
  children,
}: {
  tone?: BadgeTone;
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-[var(--r-sm)] px-2 py-0.5',
        'text-[length:var(--fs-small)] font-medium leading-[var(--lh-small)] whitespace-nowrap',
        TONES[tone],
        className,
      )}
    >
      {icon && <span className="inline-flex shrink-0" aria-hidden="true">{icon}</span>}
      {children}
    </span>
  );
}
