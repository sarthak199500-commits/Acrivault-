import { type ReactNode } from 'react';
import * as RadixDialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { IconButton } from './IconButton';

/** A centered modal dialog. Focus trapped, Escape closes, focus returned on close. */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = 'md',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}) {
  const maxW = size === 'sm' ? 'max-w-sm' : size === 'lg' ? 'max-w-2xl' : 'max-w-md';
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-[var(--z-overlay)] bg-[var(--scrim)] data-[state=open]:motion-safe:animate-[overlay-in_var(--dur-2)_var(--ease-standard)]" />
        <RadixDialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-[var(--z-modal)] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2',
            'rounded-[var(--r-lg)] border border-border-strong bg-surface shadow-[var(--shadow-xl)] outline-none',
            'data-[state=open]:motion-safe:animate-[overlay-in_var(--dur-2)_var(--ease-standard)]',
            maxW,
          )}
        >
          <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-2">
            <div className="min-w-0">
              <RadixDialog.Title className="text-[length:var(--fs-h2)] font-semibold text-text">
                {title}
              </RadixDialog.Title>
              {description && (
                <RadixDialog.Description className="mt-1 text-[length:var(--fs-small)] text-text-secondary">
                  {description}
                </RadixDialog.Description>
              )}
            </div>
            <RadixDialog.Close asChild>
              <IconButton label="Close dialog" size="sm">
                <X className="h-4 w-4" />
              </IconButton>
            </RadixDialog.Close>
          </div>
          {children && <div className="px-5 py-2">{children}</div>}
          {footer && <div className="flex justify-end gap-2 px-5 pb-4 pt-3">{footer}</div>}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
