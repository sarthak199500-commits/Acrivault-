import { type ReactNode } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';
import { count as fmtCount } from '@/lib/format';

/** A toggleable filter chip with a label and a tabular count. */
export function FilterPill({
  label,
  count,
  selected = false,
  disabled = false,
  icon,
  onClick,
}: {
  label: ReactNode;
  count?: number;
  selected?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={cn(
        'inline-flex items-center gap-2 rounded-[var(--r-pill)] border px-3 h-8',
        'text-[length:var(--fs-small)] font-medium transition-colors duration-[var(--dur-1)]',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        selected
          ? 'border-accent bg-accent-tint text-accent-text'
          : 'border-border bg-surface text-text-secondary hover:bg-surface-hover hover:text-text',
      )}
    >
      {selected ? (
        <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      ) : (
        icon && <span className="inline-flex shrink-0" aria-hidden="true">{icon}</span>
      )}
      <span>{label}</span>
      {count !== undefined && (
        <span
          className={cn(
            'tnum rounded-[var(--r-xs)] px-1 text-[length:var(--fs-micro)]',
            selected ? 'bg-accent/20 text-accent-text' : 'bg-surface-2 text-text-secondary',
          )}
        >
          {fmtCount(count)}
        </span>
      )}
    </button>
  );
}
