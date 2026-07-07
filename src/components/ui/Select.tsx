import * as RadixSelect from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface SelectOption {
  value: string;
  label: string;
}

/** A themed Radix Select. Keyboard operable, visible focus, both themes. */
export function Select({
  value,
  onValueChange,
  options,
  placeholder = 'Select…',
  ariaLabel,
  size = 'md',
  className,
  disabled,
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  ariaLabel?: string;
  size?: 'sm' | 'md';
  className?: string;
  disabled?: boolean;
}) {
  return (
    <RadixSelect.Root value={value} onValueChange={onValueChange} disabled={disabled}>
      <RadixSelect.Trigger
        aria-label={ariaLabel}
        className={cn(
          'inline-flex items-center justify-between gap-2 rounded-[var(--r-sm)] border border-border-strong bg-surface',
          'text-[length:var(--fs-small)] text-text outline-none',
          'focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--accent)_30%,transparent)]',
          'data-[placeholder]:text-text-tertiary disabled:opacity-50 disabled:cursor-not-allowed',
          size === 'sm' ? 'h-8 px-2' : 'h-9 px-2.5',
          className,
        )}
      >
        <RadixSelect.Value placeholder={placeholder} />
        <RadixSelect.Icon>
          <ChevronDown className="h-3.5 w-3.5 text-text-tertiary" aria-hidden="true" />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>
      <RadixSelect.Portal>
        <RadixSelect.Content
          position="popper"
          sideOffset={6}
          className="z-[var(--z-popover)] max-h-72 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-[var(--r-md)] border border-border-strong bg-surface-2 shadow-[var(--shadow-md)]"
        >
          <RadixSelect.Viewport className="p-1">
            {options.map((opt) => (
              <RadixSelect.Item
                key={opt.value}
                value={opt.value}
                className={cn(
                  'flex cursor-pointer items-center justify-between gap-3 rounded-[var(--r-sm)] px-2.5 py-1.5',
                  'text-[length:var(--fs-small)] text-text-secondary outline-none',
                  'data-[highlighted]:bg-surface-hover data-[highlighted]:text-text data-[state=checked]:text-text',
                )}
              >
                <RadixSelect.ItemText>{opt.label}</RadixSelect.ItemText>
                <RadixSelect.ItemIndicator>
                  <Check className="h-3.5 w-3.5 text-accent-text" aria-hidden="true" />
                </RadixSelect.ItemIndicator>
              </RadixSelect.Item>
            ))}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  );
}
