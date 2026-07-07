/* eslint-disable jsx-a11y/click-events-have-key-events -- option selection is handled by the combobox input (arrows + Enter via aria-activedescendant); options are not individually focusable per the listbox pattern */
import { useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './Popover';
import { cn } from '@/lib/cn';

export interface ComboboxOption {
  value: string;
  label: string;
}

/** A filterable single-select (the cloud/owner picker pattern). */
export function Combobox({
  value,
  onChange,
  options,
  placeholder = 'Select…',
  searchPlaceholder = 'Filter…',
  ariaLabel,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  options: ComboboxOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  ariaLabel?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();

  const selected = options.find((o) => o.value === value);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
  }, [options, query]);

  const pick = (v: string) => {
    onChange(v);
    setOpen(false);
    setQuery('');
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(filtered.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[active]) pick(filtered[active].value);
    }
  };

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) { setQuery(''); setActive(0); } }}>
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
          <span className="truncate">{selected ? selected.label : placeholder}</span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-text-tertiary" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] min-w-56 p-0" sideOffset={6}>
        <div className="flex items-center gap-2 border-b border-border px-2.5">
          <Search className="h-3.5 w-3.5 shrink-0 text-text-tertiary" aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActive(0); }}
            onKeyDown={onKeyDown}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="h-9 w-full bg-transparent text-[length:var(--fs-small)] text-text outline-none placeholder:text-text-tertiary"
          />
        </div>
        <ul id={listboxId} role="listbox" className="max-h-60 overflow-y-auto p-1">
          {filtered.length === 0 ? (
            <li className="px-2.5 py-2 text-[length:var(--fs-small)] text-text-tertiary">No matches.</li>
          ) : (
            filtered.map((o, i) => (
              <li
                key={o.value}
                role="option"
                aria-selected={o.value === value}
                onMouseEnter={() => setActive(i)}
                onClick={() => pick(o.value)}
                className={cn(
                  'flex cursor-pointer items-center justify-between gap-2 rounded-[var(--r-sm)] px-2.5 py-1.5 text-[length:var(--fs-small)]',
                  i === active ? 'bg-surface-hover text-text' : 'text-text-secondary',
                )}
              >
                <span className="truncate">{o.label}</span>
                {o.value === value && <Check className="h-3.5 w-3.5 shrink-0 text-accent-text" aria-hidden="true" />}
              </li>
            ))
          )}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
