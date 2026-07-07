import { type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type TimelineTone = 'default' | 'anomaly' | 'active' | 'done';

export interface TimelineItem {
  id: string;
  icon?: ReactNode;
  title: ReactNode;
  meta?: ReactNode;
  tone?: TimelineTone;
  selected?: boolean;
  onSelect?: () => void;
}

const NODE_TONE: Record<TimelineTone, string> = {
  default: 'border-border-strong bg-surface text-text-tertiary',
  anomaly: 'border-[var(--critical)] bg-crit-bg text-crit-fg',
  active: 'border-accent bg-accent-tint text-accent-text',
  done: 'border-accent bg-accent text-white',
};

/**
 * A vertical step list used for agent sessions and rotation phases. Supports an
 * anomaly / emphasized style. When items have onSelect they render as buttons.
 */
export function Timeline({ items, ariaLabel }: { items: TimelineItem[]; ariaLabel?: string }) {
  return (
    <ol aria-label={ariaLabel} className="relative">
      {items.map((item, i) => {
        const tone = item.tone ?? 'default';
        const isLast = i === items.length - 1;
        const inner = (
          <>
            {/* connector + node */}
            <span className="relative flex w-7 shrink-0 flex-col items-center">
              <span
                className={cn(
                  'z-10 flex h-7 w-7 items-center justify-center rounded-full border',
                  NODE_TONE[tone],
                )}
              >
                {item.icon}
              </span>
              {!isLast && <span className="absolute top-7 h-[calc(100%-4px)] w-px bg-border" aria-hidden="true" />}
            </span>
            {/* body */}
            <span className="min-w-0 flex-1 pb-4">
              <span className="flex items-center justify-between gap-2">
                <span className={cn('truncate text-[length:var(--fs-small)]', item.selected ? 'font-medium text-text' : 'text-text')}>
                  {item.title}
                </span>
                {item.meta && <span className="shrink-0 text-[length:var(--fs-micro)] text-text-secondary">{item.meta}</span>}
              </span>
            </span>
          </>
        );

        return (
          <li key={item.id} className="relative">
            {item.onSelect ? (
              <button
                type="button"
                onClick={item.onSelect}
                aria-current={item.selected ? 'true' : undefined}
                className={cn(
                  'flex w-full items-start gap-3 rounded-[var(--r-sm)] px-1.5 py-1.5 text-left outline-none',
                  'hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--accent)_35%,transparent)]',
                  item.selected && 'bg-surface-hover',
                )}
              >
                {inner}
              </button>
            ) : (
              <div className="flex items-start gap-3 px-1.5 py-1.5">{inner}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
