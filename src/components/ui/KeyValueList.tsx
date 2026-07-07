import { type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface KeyValueItem {
  label: string;
  value: ReactNode;
  /** Mark a value as a derived (Acrivault-computed) field. */
  derived?: boolean;
  mono?: boolean;
}

export function KeyValueList({
  items,
  className,
  boxed = false,
}: {
  items: KeyValueItem[];
  className?: string;
  /** Wrap the list in the standard summary-box chrome (dialog/review panels). */
  boxed?: boolean;
}) {
  return (
    <dl
      className={cn(
        'grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5',
        boxed && 'rounded-[var(--r-md)] border border-border bg-surface-2 p-3',
        className,
      )}
    >
      {items.map((item, i) => (
        <div key={i} className="contents">
          <dt className="flex items-center gap-1.5 text-[length:var(--fs-small)] text-text-tertiary">
            {item.label}
            {item.derived && (
              <span className="rounded-[var(--r-xs)] bg-surface-2 px-1 text-[length:var(--fs-micro)] text-text-secondary">
                derived
              </span>
            )}
          </dt>
          <dd
            className={cn(
              'min-w-0 break-words text-right text-[length:var(--fs-small)] text-text',
              item.mono && 'font-mono',
            )}
          >
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
