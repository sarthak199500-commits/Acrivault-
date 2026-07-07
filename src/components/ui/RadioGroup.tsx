import * as Radix from '@radix-ui/react-radio-group';
import { cn } from '@/lib/cn';

export interface RadioOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

/** A styled Radix Radio Group. Keyboard operable with roving focus. */
export function RadioGroup({
  value,
  onValueChange,
  options,
  ariaLabel,
  orientation = 'vertical',
  className,
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: RadioOption[];
  ariaLabel?: string;
  orientation?: 'vertical' | 'horizontal';
  className?: string;
}) {
  return (
    <Radix.Root
      value={value}
      onValueChange={onValueChange}
      aria-label={ariaLabel}
      orientation={orientation}
      className={cn(orientation === 'vertical' ? 'flex flex-col gap-2' : 'flex flex-wrap gap-4', className)}
    >
      {options.map((opt) => (
        <label
          key={opt.value}
          className={cn(
            'flex cursor-pointer items-start gap-2.5 text-[length:var(--fs-small)]',
            opt.disabled && 'cursor-not-allowed opacity-50',
          )}
        >
          <Radix.Item
            value={opt.value}
            disabled={opt.disabled}
            className={cn(
              'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border bg-surface outline-none',
              'border-border-strong data-[state=checked]:border-accent',
              'focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--accent)_30%,transparent)]',
            )}
          >
            <Radix.Indicator className="block h-2 w-2 rounded-full bg-accent" />
          </Radix.Item>
          <span className="min-w-0">
            <span className="block text-text">{opt.label}</span>
            {opt.description && <span className="block text-[length:var(--fs-micro)] text-text-tertiary">{opt.description}</span>}
          </span>
        </label>
      ))}
    </Radix.Root>
  );
}
