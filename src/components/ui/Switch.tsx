import * as RadixSwitch from '@radix-ui/react-switch';
import { cn } from '@/lib/cn';

export function Switch({
  checked,
  onCheckedChange,
  disabled,
  id,
  ariaLabel,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  ariaLabel?: string;
}) {
  return (
    <RadixSwitch.Root
      id={id}
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 items-center rounded-[var(--r-pill)] border transition-colors outline-none',
        'focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--accent)_35%,transparent)]',
        'data-[state=unchecked]:border-border-strong data-[state=unchecked]:bg-surface-2',
        'data-[state=checked]:border-accent data-[state=checked]:bg-accent',
        'disabled:opacity-50 disabled:cursor-not-allowed',
      )}
    >
      <RadixSwitch.Thumb className="block h-3.5 w-3.5 translate-x-0.5 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-[18px]" />
    </RadixSwitch.Root>
  );
}
