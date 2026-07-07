import { type ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** Explains an absence and offers the next action. Not an error. */
export function EmptyState({
  icon,
  headline,
  guidance,
  action,
  className,
}: {
  icon?: ReactNode;
  headline: string;
  guidance?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 px-6 py-12 text-center',
        className,
      )}
    >
      {icon && (
        <div className="flex h-11 w-11 items-center justify-center rounded-[var(--r-lg)] bg-surface-2 text-text-tertiary">
          {icon}
        </div>
      )}
      <div className="space-y-1">
        <p className="text-[length:var(--fs-h2)] font-semibold text-text">{headline}</p>
        {guidance && <p className="max-w-sm text-[length:var(--fs-small)] text-text-secondary">{guidance}</p>}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
