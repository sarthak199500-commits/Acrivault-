import * as RadixSwitch from '@radix-ui/react-switch';
import { cn } from '@/lib/cn';

export function Switch({
  checked,
  onCheckedChange,
  disabled,
  id,
  ariaLabel,
  ariaDescribedBy,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  ariaLabel?: string;
  /**
   * Id of the helper text under the label. A switch whose description is only
   * *near* it is a switch a screen reader user operates without ever hearing
   * what it does.
   */
  ariaDescribedBy?: string;
}) {
  return (
    <RadixSwitch.Root
      id={id}
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 items-center rounded-[var(--r-pill)] border transition-colors outline-none',
        // The track is 36×20, which is under the 24×24 minimum in WCAG 2.2
        // (2.5.8). A pseudo-element grows the POINTER target to 36×32 without
        // moving the control or changing the visual, so the switch still reads
        // as a switch and is still hittable on a phone. Axe does not check
        // target size, which is how the whole app passed a clean sweep with
        // every switch under the minimum.
        'before:absolute before:inset-x-0 before:-inset-y-1.5 before:content-[""]',
        'disabled:before:hidden',
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
