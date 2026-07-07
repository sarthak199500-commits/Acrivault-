/* eslint-disable jsx-a11y/no-noninteractive-tabindex -- a scrollable read-only region must be keyboard-focusable (axe: scrollable-region-focusable) */
import { type ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * Wraps a horizontally-scrollable table in a keyboard-focusable region so keyboard
 * users can scroll it. Read-only tables have no focusable cells, so the region
 * itself must take focus.
 */
export function ScrollableTable({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      role="region"
      aria-label={label}
      tabIndex={0}
      className={cn(
        'overflow-x-auto outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--accent)_30%,transparent)]',
        className,
      )}
    >
      {children}
    </div>
  );
}
