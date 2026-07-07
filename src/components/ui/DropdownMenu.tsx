import { type ReactNode } from 'react';
import * as Radix from '@radix-ui/react-dropdown-menu';
import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';

export const DropdownMenu = Radix.Root;
export const DropdownMenuTrigger = Radix.Trigger;

export function DropdownMenuContent({
  children,
  align = 'end',
  className,
}: {
  children: ReactNode;
  align?: 'start' | 'center' | 'end';
  className?: string;
}) {
  return (
    <Radix.Portal>
      <Radix.Content
        align={align}
        sideOffset={6}
        className={cn(
          'z-[var(--z-dropdown)] min-w-48 overflow-hidden rounded-[var(--r-md)] border border-border-strong bg-surface-2 p-1 shadow-[var(--shadow-md)]',
          'data-[state=open]:motion-safe:animate-[acv-skeleton_0ms]',
          className,
        )}
      >
        {children}
      </Radix.Content>
    </Radix.Portal>
  );
}

export function DropdownMenuItem({
  children,
  onSelect,
  disabled,
  selected,
  className,
  title,
}: {
  children: ReactNode;
  onSelect?: () => void;
  disabled?: boolean;
  selected?: boolean;
  className?: string;
  /** Native tooltip — used to explain why a disabled item is unavailable. */
  title?: string;
}) {
  return (
    <Radix.Item
      disabled={disabled}
      onSelect={onSelect}
      title={title}
      className={cn(
        'flex cursor-pointer items-center justify-between gap-3 rounded-[var(--r-sm)] px-2.5 py-1.5',
        'text-[length:var(--fs-small)] text-text-secondary outline-none',
        'data-[highlighted]:bg-surface-hover data-[highlighted]:text-text',
        'data-[disabled]:opacity-40 data-[disabled]:cursor-not-allowed',
        className,
      )}
    >
      <span className="min-w-0">{children}</span>
      {selected && <Check className="h-3.5 w-3.5 shrink-0 text-accent-text" aria-hidden="true" />}
    </Radix.Item>
  );
}

export function DropdownMenuLabel({ children }: { children: ReactNode }) {
  return <Radix.Label className="px-2.5 pb-1 pt-1.5 eyebrow">{children}</Radix.Label>;
}

export function DropdownMenuSeparator() {
  return <Radix.Separator className="my-1 h-px bg-border" />;
}
