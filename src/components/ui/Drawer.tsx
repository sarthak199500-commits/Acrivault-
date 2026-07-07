import { useEffect, useRef, type ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { IconButton } from './IconButton';

/**
 * A right-side panel built on Radix Dialog. Used for Identity Detail and the
 * Session Replay side rail. Focus is trapped and returned on close; Escape closes.
 * Below the tablet breakpoint it becomes a full-width drawer.
 */
export function Drawer({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  width = 'var(--panel-w)',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}) {
  // Routed usage mounts/unmounts the whole dialog on navigation, so Radix never
  // gets to run its own focus return (there is no Trigger and no open→closed
  // transition while mounted). Capture the opener on mount and restore focus on
  // unmount — only when focus was actually dropped and the opener still exists
  // (i.e. not when the user navigated to a different screen from inside the panel).
  // Capture during the first render, not in an effect: Radix moves focus into
  // the dialog from a child effect that runs before this component's effects.
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const captured = useRef(false);
  if (!captured.current) {
    captured.current = true;
    returnFocusRef.current = document.activeElement as HTMLElement | null;
  }
  useEffect(() => {
    return () => {
      const el = returnFocusRef.current;
      const restore = () => {
        const focusDropped = document.activeElement === document.body || document.activeElement === null;
        if (focusDropped && el && el.isConnected) el.focus();
      };
      // By passive-cleanup time the unmount commit (dialog and, on a full route
      // change, the opener too) is already in the DOM, so the guards are safe.
      // The timeout re-checks once the next route's commit has settled. No rAF:
      // it never fires in backgrounded tabs.
      restore();
      setTimeout(restore, 0);
    };
  }, []);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-[var(--z-overlay)] bg-[var(--scrim)] data-[state=open]:motion-safe:animate-[overlay-in_var(--dur-2)_var(--ease-standard)]"
        />
        <Dialog.Content
          {...(description ? {} : { 'aria-describedby': undefined })}
          className={cn(
            'fixed inset-y-0 right-0 z-[var(--z-modal)] flex w-full flex-col border-l border-border bg-surface shadow-[var(--shadow-xl)]',
            'outline-none focus:outline-none',
            'data-[state=open]:motion-safe:animate-[drawer-in_var(--dur-3)_var(--ease-emphasized)]',
          )}
          style={{ maxWidth: width }}
        >
          <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
            <div className="min-w-0">
              <Dialog.Title className="text-[length:var(--fs-h1)] font-semibold leading-[var(--lh-h1)] text-text">
                {title}
              </Dialog.Title>
              {description && (
                <Dialog.Description className="mt-0.5 text-[length:var(--fs-small)] text-text-secondary">
                  {description}
                </Dialog.Description>
              )}
            </div>
            <Dialog.Close asChild>
              <IconButton label="Close panel">
                <X className="h-4 w-4" />
              </IconButton>
            </Dialog.Close>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>

          {footer && <div className="border-t border-border px-5 py-3">{footer}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
