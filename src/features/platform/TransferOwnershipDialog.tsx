import { useMemo, useState } from 'react';
import { useTransferOwnership } from './queries';
import { ROLE_LABELS } from '@/lib/permissions';
import type { User } from '@/mocks/types';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { InlineAlert } from '@/components/ui/InlineAlert';
import { Input } from '@/components/ui/Input';
import { toast } from '@/stores/toast';
import { errorInfo } from '@/lib/apiError';
import { CURRENT_USER_ID } from '@/stores/auth';

/**
 * Hand the Tenant Owner role to someone else.
 *
 * Two-step on purpose: pick the person, then type their email to confirm. This
 * is the one action a Tenant Admin cannot undo for you — after it lands, the
 * outgoing Owner no longer holds `tenant.transferOwnership` — so it gets the
 * same typed confirmation the product uses for its other irreversible actions
 * rather than a bare "Are you sure?".
 */
export function TransferOwnershipDialog({
  open,
  onOpenChange,
  users,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: User[];
}) {
  const transfer = useTransferOwnership();
  const [targetId, setTargetId] = useState('');
  const [typed, setTyped] = useState('');

  // Ownership can only pass to an active person who is not already the Owner and
  // not the signed-in actor — the same three rules the mock API enforces, so the
  // dialog cannot offer a choice the write will refuse.
  const candidates = useMemo(
    () =>
      users.filter(
        (u) => u.status === 'active' && u.role !== 'tenant-owner' && u.id !== CURRENT_USER_ID,
      ),
    [users],
  );

  const target = candidates.find((u) => u.id === targetId);
  const confirmed = Boolean(target) && typed.trim().toLowerCase() === target?.email.toLowerCase();

  const close = () => {
    onOpenChange(false);
    setTargetId('');
    setTyped('');
  };

  const submit = () => {
    if (!target || !confirmed) return;
    transfer.mutate(target.id, {
      onSuccess: () => {
        toast(`${target.email} is now the Tenant Owner`, { tone: 'success' });
        close();
      },
      onError: (err) => toast(errorInfo(err).message, { tone: 'critical' }),
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(true) : close())}
      title="Transfer ownership"
      description="A tenant has exactly one Owner, so this is a swap, not a grant."
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={submit}
            disabled={!confirmed || transfer.isPending}
            loading={transfer.isPending}
          >
            Transfer ownership
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <InlineAlert tone="warning" title="This cannot be undone by you.">
          You will become a {ROLE_LABELS['tenant-admin']} in the same write. Only the new Owner can
          transfer it back.
        </InlineAlert>

        {candidates.length === 0 ? (
          <p className="text-[length:var(--fs-small)] text-text-secondary">
            There is no one to transfer to. Ownership can only pass to another active user.
          </p>
        ) : (
          <>
            <div>
              {/* Not a <label htmlFor>: the Radix trigger is a button, so the
                  accessible name comes from ariaLabel below. */}
              <span className="mb-1.5 block text-[length:var(--fs-small)] text-text">
                New Owner
              </span>
              <Select
                value={targetId}
                onValueChange={(v) => {
                  setTargetId(v);
                  setTyped('');
                }}
                options={candidates.map((u) => ({
                  value: u.id,
                  label: `${u.name} · ${u.email}`,
                }))}
                placeholder="Choose a person…"
                ariaLabel="New Owner"
                className="w-full"
              />
            </div>

            {target && (
              <Input
                id="transfer-confirm"
                label={`Type ${target.email} to confirm`}
                hint="Synthetic — no upstream state changes. The transfer is written to the audit log."
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
            )}
          </>
        )}
      </div>
    </Dialog>
  );
}
