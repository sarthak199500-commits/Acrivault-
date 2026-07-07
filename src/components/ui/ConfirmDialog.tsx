import { type ReactNode } from 'react';
import { Dialog } from './Dialog';
import { Button, type ButtonVariant } from './Button';

/**
 * A confirmation modal for a reversible or destructive action. Focus is trapped
 * and returned on close (via Dialog). Use the danger variant + stricter copy for
 * permanent actions.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  confirmVariant = 'primary',
  pending,
  onConfirm,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  confirmVariant?: ButtonVariant;
  pending?: boolean;
  onConfirm: () => void;
  children?: ReactNode;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      size="sm"
      title={title}
      description={description}
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>
            {cancelLabel}
          </Button>
          <Button variant={confirmVariant} loading={pending} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
    </Dialog>
  );
}
