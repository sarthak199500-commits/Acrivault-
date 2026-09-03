import { type ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * Standard screen header. The h1 carries id="main-heading" so the route
 * announcer can move focus here on navigation (one h1 per screen).
 */
export function ScreenHeader({
  eyebrow,
  title,
  badge,
  description,
  actions,
  className,
}: {
  eyebrow?: string;
  title: string;
  /** State chip shown beside the h1 — a lifecycle state, never a location. */
  badge?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mb-6 flex flex-wrap items-start justify-between gap-4', className)}>
      <div className="min-w-0">
        {eyebrow && <div className="mb-1 eyebrow">{eyebrow}</div>}
        <div className="flex flex-wrap items-center gap-2">
          <h1
            id="main-heading"
            tabIndex={-1}
            className="text-[length:var(--fs-display)] font-semibold leading-[var(--lh-display)] tracking-tight text-text outline-none"
          >
            {title}
          </h1>
          {badge}
        </div>
        {description && (
          <p className="mt-1 max-w-2xl text-[length:var(--fs-body)] text-text-secondary">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
