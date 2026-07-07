import { forwardRef } from 'react';
import * as Radix from '@radix-ui/react-checkbox';
import { Check, Minus } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface CheckboxProps {
  checked?: boolean | 'indeterminate';
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  'aria-label'?: string;
  id?: string;
  className?: string;
}

export const Checkbox = forwardRef<HTMLButtonElement, CheckboxProps>(function Checkbox(
  { checked, onCheckedChange, disabled, className, ...props },
  ref,
) {
  return (
    <Radix.Root
      ref={ref}
      checked={checked}
      onCheckedChange={(v) => onCheckedChange?.(v === true)}
      disabled={disabled}
      className={cn(
        'flex h-4 w-4 shrink-0 items-center justify-center rounded-[var(--r-xs)] border bg-surface',
        'transition-colors duration-[var(--dur-1)]',
        'data-[state=checked]:border-accent data-[state=checked]:bg-accent',
        'data-[state=indeterminate]:border-accent data-[state=indeterminate]:bg-accent',
        'border-border-strong disabled:opacity-40 disabled:cursor-not-allowed',
        className,
      )}
      {...props}
    >
      <Radix.Indicator className="text-white">
        {checked === 'indeterminate' ? (
          <Minus className="h-3 w-3" aria-hidden="true" />
        ) : (
          <Check className="h-3 w-3" aria-hidden="true" />
        )}
      </Radix.Indicator>
    </Radix.Root>
  );
});
