import * as Radix from '@radix-ui/react-slider';
import { cn } from '@/lib/cn';

/** A single-thumb Radix Slider themed to tokens. */
export function Slider({
  value,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  ariaLabel,
  disabled,
  className,
}: {
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  ariaLabel?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <Radix.Root
      value={[value]}
      onValueChange={(v) => onValueChange(v[0])}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn('relative flex h-5 w-full touch-none select-none items-center', disabled && 'opacity-50', className)}
    >
      <Radix.Track className="relative h-1.5 grow overflow-hidden rounded-full bg-surface-2">
        <Radix.Range className="absolute h-full rounded-full bg-accent" />
      </Radix.Track>
      <Radix.Thumb
        aria-label={ariaLabel}
        className={cn(
          'block h-4 w-4 rounded-full border-2 border-accent bg-surface shadow-[var(--shadow-sm)] outline-none',
          'focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--accent)_35%,transparent)]',
        )}
      />
    </Radix.Root>
  );
}
