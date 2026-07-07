import { type ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** A quiet neutral label for metadata (governance, owner, type names). */
export function Tag({
  icon,
  className,
  children,
}: {
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-[var(--r-sm)] border border-border bg-surface-2 px-1.5 py-0.5',
        'text-[length:var(--fs-small)] text-text-secondary whitespace-nowrap',
        className,
      )}
    >
      {icon && <span className="inline-flex shrink-0 text-text-tertiary" aria-hidden="true">{icon}</span>}
      {children}
    </span>
  );
}
