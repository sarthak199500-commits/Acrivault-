import { type ReactNode } from 'react';
import * as Radix from '@radix-ui/react-popover';
import { cn } from '@/lib/cn';

export const Popover = Radix.Root;
export const PopoverTrigger = Radix.Trigger;
export const PopoverAnchor = Radix.Anchor;

/** Themed popover surface. Style the trigger yourself. */
export function PopoverContent({
  children,
  align = 'center',
  side = 'bottom',
  sideOffset = 6,
  className,
  ariaLabel,
}: {
  children: ReactNode;
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'right' | 'bottom' | 'left';
  sideOffset?: number;
  className?: string;
  /** Accessible name for the popover (its content has role="dialog"). */
  ariaLabel?: string;
}) {
  return (
    <Radix.Portal>
      <Radix.Content
        align={align}
        side={side}
        sideOffset={sideOffset}
        aria-label={ariaLabel}
        className={cn(
          'z-[var(--z-popover)] rounded-[var(--r-md)] border border-border-strong bg-surface-2 p-3 shadow-[var(--shadow-md)] outline-none',
          'data-[state=open]:motion-safe:animate-[overlay-in_var(--dur-2)_var(--ease-standard)]',
          className,
        )}
      >
        {children}
        <Radix.Arrow className="fill-[var(--surface-2)]" />
      </Radix.Content>
    </Radix.Portal>
  );
}
