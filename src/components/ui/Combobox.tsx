/* eslint-disable jsx-a11y/click-events-have-key-events -- option selection is handled by the combobox input (arrows + Enter via aria-activedescendant); options are not individually focusable per the listbox pattern */
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './Popover';
import { cn } from '@/lib/cn';

export interface ComboboxOption {
  value: string;
  label: string;
  /** Right-aligned secondary column — counts, scores, a reason it is unselectable. */
  meta?: string;
  /** Listed but not choosable, so a near-miss explains itself instead of vanishing. */
  disabled?: boolean;
}

/**
 * A filterable single-select (the cloud/owner picker pattern).
 *
 * Filters its own options by default. Pass `onQueryChange` and the caller owns the
 * search instead — needed once the candidate set is too large to ship to the browser,
 * where client-side filtering would mean a huge payload and laggy typing.
 */
export function Combobox({
  value,
  onChange,
  options,
  placeholder = 'Select…',
  searchPlaceholder = 'Filter…',
  ariaLabel,
  className,
  onQueryChange,
  selectedLabel,
  groupLabel,
  footer,
  emptyContent,
  loading = false,
}: {
  value: string;
  onChange: (value: string) => void;
  options: ComboboxOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  ariaLabel?: string;
  className?: string;
  /**
   * Trigger label for when the selection is absent from `options` — which happens
   * whenever a search narrows the list past it. Without this the caller has to inject
   * the selection as a fake option, and it then shows up as a search result.
   */
  selectedLabel?: string;
  /** Provide to search server-side; the component then stops filtering locally. */
  onQueryChange?: (query: string) => void;
  /** Heading above the list, for when the options are suggestions rather than everything. */
  groupLabel?: ReactNode;
  /** Persistent row under the list — a count, a route onward. */
  footer?: ReactNode;
  /** Shown instead of "No matches." so a failed search can offer a way forward. */
  emptyContent?: ReactNode;
  loading?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();
  const serverSide = !!onQueryChange;

  const selected = options.find((o) => o.value === value);
  const filtered = useMemo(() => {
    if (serverSide) return options;
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
  }, [options, query, serverSide]);

  // Results can change under the cursor while searching; never leave the highlight
  // pointing past the end of the list.
  useEffect(() => {
    setActive((i) => (i >= filtered.length ? 0 : i));
  }, [filtered.length]);

  const pick = (v: string) => {
    onChange(v);
    setOpen(false);
    setQuery('');
    onQueryChange?.('');
  };

  /** Step the highlight, stepping over anything unselectable. */
  const move = (dir: 1 | -1) =>
    setActive((from) => {
      for (let i = from + dir; i >= 0 && i < filtered.length; i += dir) {
        if (!filtered[i].disabled) return i;
      }
      return from;
    });

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      move(1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      move(-1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const o = filtered[active];
      if (o && !o.disabled) pick(o.value);
    }
  };

  const optionId = (i: number) => `${listboxId}-opt-${i}`;

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) {
          setQuery('');
          setActive(0);
        } else {
          onQueryChange?.('');
        }
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls={listboxId}
          aria-label={ariaLabel}
          className={cn(
            'inline-flex h-9 items-center justify-between gap-2 rounded-[var(--r-sm)] border border-border-strong bg-surface px-2.5',
            'text-[length:var(--fs-small)] outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--accent)_30%,transparent)]',
            selected ? 'text-text' : 'text-text-tertiary',
            className,
          )}
        >
          <span className="truncate">{selected?.label ?? selectedLabel ?? placeholder}</span>
          {selected?.meta && (
            <span className="tnum shrink-0 text-[length:var(--fs-micro)] text-text-tertiary">{selected.meta}</span>
          )}
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-text-tertiary" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] min-w-56 p-0" sideOffset={6}>
        <div className="flex items-center gap-2 border-b border-border px-2.5">
          <Search className="h-3.5 w-3.5 shrink-0 text-text-tertiary" aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
              onQueryChange?.(e.target.value);
            }}
            onKeyDown={onKeyDown}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            aria-activedescendant={filtered[active] ? optionId(active) : undefined}
            className="h-9 w-full bg-transparent text-[length:var(--fs-small)] text-text outline-none placeholder:text-text-tertiary"
          />
        </div>

        {groupLabel && filtered.length > 0 && (
          <p className="eyebrow border-b border-border px-2.5 py-1.5 text-text-tertiary">{groupLabel}</p>
        )}

        <ul id={listboxId} role="listbox" className="max-h-60 overflow-y-auto p-1">
          {loading ? (
            <li className="px-2.5 py-2 text-[length:var(--fs-small)] text-text-tertiary">Searching…</li>
          ) : filtered.length === 0 ? (
            <li className="px-2.5 py-2 text-[length:var(--fs-small)] text-text-tertiary">
              {emptyContent ?? 'No matches.'}
            </li>
          ) : (
            filtered.map((o, i) => (
              <li
                key={o.value}
                id={optionId(i)}
                role="option"
                aria-selected={o.value === value}
                aria-disabled={o.disabled || undefined}
                onMouseEnter={() => !o.disabled && setActive(i)}
                onClick={() => !o.disabled && pick(o.value)}
                className={cn(
                  'flex items-center justify-between gap-2 rounded-[var(--r-sm)] px-2.5 py-1.5 text-[length:var(--fs-small)]',
                  o.disabled
                    ? 'cursor-default text-text-tertiary'
                    : cn('cursor-pointer', i === active ? 'bg-surface-hover text-text' : 'text-text-secondary'),
                )}
              >
                <span className="truncate">{o.label}</span>
                <span className="flex shrink-0 items-center gap-2">
                  {o.meta && <span className="tnum text-[length:var(--fs-micro)] text-text-tertiary">{o.meta}</span>}
                  {o.value === value && <Check className="h-3.5 w-3.5 text-accent-text" aria-hidden="true" />}
                </span>
              </li>
            ))
          )}
        </ul>

        {footer && (
          <div className="flex items-center justify-between gap-2 border-t border-border px-2.5 py-1.5 text-[length:var(--fs-micro)] text-text-tertiary">
            {footer}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
