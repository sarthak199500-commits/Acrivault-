import { type ReactNode } from 'react';
import { ChevronDown, Filter } from 'lucide-react';
import { cn } from '@/lib/cn';
import { count as fmtCount } from '@/lib/format';
import { Checkbox } from './Checkbox';
import { Popover, PopoverContent, PopoverTrigger } from './Popover';

export interface FilterMenuOption {
  value: string;
  label: string;
  count?: number;
  /** Optional leading color swatch / icon (e.g. a risk-band dot). */
  swatch?: ReactNode;
}

/**
 * A multi-select dropdown filter: a labeled trigger (with an active-count badge)
 * that opens a checkbox list. Selections persist while the panel stays open
 * (built on Popover, not a menu, so it doesn't close on each toggle).
 */
export function FilterMenu({
  label,
  options,
  selected,
  onToggle,
  onClear,
  icon,
}: {
  label: string;
  options: FilterMenuOption[];
  selected: string[];
  onToggle: (value: string) => void;
  onClear?: () => void;
  icon?: ReactNode;
}) {
  const active = selected.length;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={active ? `${label}, ${active} selected` : label}
          className={cn(
            'inline-flex h-9 items-center gap-2 rounded-[var(--r-sm)] border px-3',
            'text-[length:var(--fs-small)] font-medium transition-colors duration-[var(--dur-1)]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--accent)_30%,transparent)]',
            active
              ? 'border-accent bg-accent-tint text-accent-text'
              : 'border-border-strong bg-surface text-text-secondary hover:bg-surface-hover hover:text-text',
          )}
        >
          <span className="inline-flex shrink-0" aria-hidden="true">{icon ?? <Filter className="h-3.5 w-3.5" />}</span>
          {label}
          {active > 0 && (
            <span className="tnum rounded-[var(--r-xs)] bg-accent/20 px-1 text-[length:var(--fs-micro)]">
              {active}
            </span>
          )}
          <ChevronDown className="h-3.5 w-3.5 text-text-tertiary" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" ariaLabel={`${label} filter`} className="w-60 p-1.5">
        <div className="flex items-center justify-between px-1.5 pb-1.5">
          <span className="eyebrow">{label}</span>
          {active > 0 && onClear && (
            <button
              type="button"
              onClick={onClear}
              className="text-[length:var(--fs-micro)] font-medium text-accent-text hover:underline"
            >
              Clear
            </button>
          )}
        </div>
        <ul className="max-h-72 space-y-0.5 overflow-y-auto">
          {options.map((opt) => (
            <li key={opt.value}>
              <label className="flex cursor-pointer items-center gap-2.5 rounded-[var(--r-sm)] px-1.5 py-1.5 hover:bg-surface-hover">
                <Checkbox
                  checked={selected.includes(opt.value)}
                  onCheckedChange={() => onToggle(opt.value)}
                  aria-label={opt.label}
                />
                {opt.swatch && <span className="inline-flex shrink-0" aria-hidden="true">{opt.swatch}</span>}
                <span className="min-w-0 flex-1 truncate text-[length:var(--fs-small)] text-text">{opt.label}</span>
                {opt.count !== undefined && (
                  <span className="tnum text-[length:var(--fs-micro)] text-text-tertiary">{fmtCount(opt.count)}</span>
                )}
              </label>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
