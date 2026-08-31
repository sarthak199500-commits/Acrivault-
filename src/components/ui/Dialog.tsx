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
            // Centring on a taller-than-viewport dialog crops it at both ends and puts
            // the footer out of reach. Cap it to the viewport and scroll the body, so
            // the title and the actions stay put and only the content moves. dvh keeps
            // it correct while mobile browser chrome expands and collapses.
            'flex max-h-[calc(100dvh-2rem)] flex-col',
            'rounded-[var(--r-lg)] border border-border-strong bg-surface shadow-[var(--shadow-xl)] outline-none',
            'data-[state=open]:motion-safe:animate-[overlay-in_var(--dur-2)_var(--ease-standard)]',
            maxW,
          )}
        >
          <div className="flex shrink-0 items-start justify-between gap-3 px-5 pt-4 pb-2">
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
          {/* min-h-0 lets this flex child actually shrink; without it the body keeps
              its full content height and the cap above does nothing. */}
          {children && <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-2">{children}</div>}
          {footer && <div className="flex shrink-0 justify-end gap-2 px-5 pb-4 pt-3">{footer}</div>}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
