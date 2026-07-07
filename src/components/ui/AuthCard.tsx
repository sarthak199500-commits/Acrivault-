import { type ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * The centered card the registration and authentication screens render into. The
 * h1 carries id="main-heading" so the AuthLayout announcer can move focus here on
 * navigation (one h1 per screen).
 */
export function AuthCard({
  title,
  description,
  children,
  footer,
  progress,
  className,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** Optional progress indicator (e.g. the registration stepper) shown above the title. */
  progress?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'w-full rounded-[var(--r-lg)] border border-border bg-surface shadow-[var(--shadow-lg)]',
        className,
      )}
    >
      <div className="px-6 pt-6 pb-2">
        {progress && <div className="mb-5">{progress}</div>}
        <h1
          id="main-heading"
          tabIndex={-1}
          className="text-[length:var(--fs-h1)] font-semibold leading-[var(--lh-h1)] tracking-tight text-text outline-none"
        >
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 text-[length:var(--fs-small)] leading-[var(--lh-small)] text-text-secondary">
            {description}
          </p>
        )}
      </div>
      <div className="px-6 py-4">{children}</div>
      {footer && (
        <div className="border-t border-border px-6 py-4 text-[length:var(--fs-small)] text-text-secondary">
          {footer}
        </div>
      )}
    </div>
  );
}
