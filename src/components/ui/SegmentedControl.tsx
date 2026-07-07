import { type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
}

/**
 * A compact segmented control for switching between a few mutually-exclusive
 * views (e.g. Table / Graph). Keyboard-operable, with `aria-pressed` on each
 * segment; never conveys the selection by color alone.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  size = 'md',
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  size?: 'sm' | 'md';
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="inline-flex items-center rounded-[var(--r-sm)] border border-border-strong bg-surface p-0.5"
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-[var(--r-xs)] font-medium transition-colors duration-[var(--dur-1)]',
              size === 'sm' ? 'h-7 px-2.5 text-[length:var(--fs-small)]' : 'h-8 px-3 text-[length:var(--fs-small)]',
              active
                ? 'bg-accent-tint text-accent-text'
                : 'text-text-secondary hover:text-text',
            )}
          >
            {opt.icon && <span className="inline-flex shrink-0" aria-hidden="true">{opt.icon}</span>}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
