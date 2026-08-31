import { useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type TimelineTone = 'default' | 'anomaly' | 'active' | 'done';

export interface TimelineItem {
  id: string;
  icon?: ReactNode;
  /** The primary line — what this step actually did, not what kind of step it is. */
  title: ReactNode;
  /** Secondary line: kind, scope, or any classification of the step. */
  subtitle?: ReactNode;
  /** Trailing marker, e.g. elapsed time or an ordinal. */
  meta?: ReactNode;
  /**
   * Rendered after the title. Must contain real text — the anomaly marker used to be
   * an `<svg aria-label>` with no role, so the row's accessible name was just
   * "Prompt #1" and the flag was carried by color alone.
   */
  flag?: ReactNode;
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
 * A vertical step list used for agent sessions and rotation phases.
 *
 * Selectable timelines are a single composite widget, not a run of tab stops: arrows
 * move between steps, Home/End jump to the ends, and the whole list holds one tab stop.
 * A 14-step session was 14 stops to cross before this.
 */
export function Timeline({ items, ariaLabel }: { items: TimelineItem[]; ariaLabel?: string }) {
  const listRef = useRef<HTMLOListElement>(null);
  const selectedIndex = items.findIndex((i) => i.selected);

  // Keep the selection visible. Jumping between anomalies changed the detail pane while
  // the timeline stayed put, so a selected step below the fold looked like a no-op.
  useEffect(() => {
    if (selectedIndex < 0) return;
    const el = listRef.current?.querySelectorAll('li')[selectedIndex];
    if (el && typeof el.scrollIntoView === 'function') el.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const deltas: Record<string, number> = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
    let next: number | null = null;
    if (event.key in deltas) next = Math.min(items.length - 1, Math.max(0, selectedIndex + deltas[event.key]));
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = items.length - 1;
    if (next === null || next === selectedIndex) return;
    event.preventDefault();
    items[next].onSelect?.();
    listRef.current?.querySelectorAll('button')[next]?.focus();
  };

  return (
    <ol ref={listRef} aria-label={ariaLabel} className="relative">
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
              <span className="flex items-baseline justify-between gap-2">
                <span
                  className={cn(
                    'min-w-0 truncate text-[length:var(--fs-small)]',
                    item.selected ? 'font-medium text-text' : 'text-text',
                  )}
                >
                  {item.title}
                </span>
                {item.meta && (
                  <span className="tnum shrink-0 text-[length:var(--fs-micro)] text-text-tertiary">{item.meta}</span>
                )}
              </span>
              {(item.subtitle || item.flag) && (
                <span className="mt-0.5 flex items-center gap-1.5 text-[length:var(--fs-micro)] text-text-tertiary">
                  {item.subtitle && <span className="truncate">{item.subtitle}</span>}
                  {item.flag}
                </span>
              )}
            </span>
          </>
        );

        return (
          <li key={item.id} className="relative">
            {item.onSelect ? (
              <button
                type="button"
                onClick={item.onSelect}
                onKeyDown={onKeyDown}
                aria-current={item.selected ? 'true' : undefined}
                // One tab stop for the whole list; arrows move within it.
                tabIndex={item.selected || (selectedIndex < 0 && i === 0) ? 0 : -1}
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
