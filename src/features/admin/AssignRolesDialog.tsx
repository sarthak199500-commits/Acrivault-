import { useEffect, useMemo, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Select } from '@/components/ui/Select';
import { Banner } from '@/components/ui/Banner';
import { InlineAlert } from '@/components/ui/InlineAlert';
import { PermissionsSummary } from '@/components/ui/PermissionsSummary';
import { assignableRoles, ROLE_LABELS, type Role } from '@/lib/permissions';
import { displayName } from '@/lib/user';
import { errorInfo } from '@/lib/apiError';
import type { User } from '@/mocks/types';
import { useUiStore } from '@/stores/ui';
import { toast } from '@/stores/toast';
import { useAssignRole } from './queries';

/**
 * Give a role to the people Entra provisioned without one. Granting access is the
 * most consequential thing on this screen, so the chosen role's permissions are
 * spelled out before the button commits them — the same weight the old invitation
 * flow gave the decision.
 */
export function AssignRolesDialog({
  open,
  onOpenChange,
  candidates,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidates: User[];
}) {
  const actorRole = useUiStore((s) => s.role);
  const assign = useAssignRole();

  const [role, setRole] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [banner, setBanner] = useState<string | undefined>();

  // Everyone waiting is preselected: assigning them together is the common case,
  // and deselecting is easier than picking each one out.
  useEffect(() => {
    if (open) {
      setSelected(new Set(candidates.map((u) => u.id)));
      setRole('');
      setBanner(undefined);
    }
    // Re-seeding on every candidates change would fight the user's own toggles.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const roleOptions = useMemo(
    () => assignableRoles(actorRole).map((r) => ({ value: r, label: ROLE_LABELS[r] })),
    [actorRole],
  );

  const single = candidates.length === 1;
  const count = selected.size;

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const submit = async () => {
    setBanner(undefined);
    if (!role || count === 0) return;
    const chosen = candidates.filter((u) => selected.has(u.id));
    try {
      await assign.mutateAsync({ ids: chosen.map((u) => u.id), role: role as Role });
      toast(
        chosen.length === 1
          ? `${displayName(chosen[0])} is now a ${ROLE_LABELS[role as Role]}.`
          : `${chosen.length} people are now ${ROLE_LABELS[role as Role]}s.`,
        { tone: 'success' },
      );
      onOpenChange(false);
    } catch (err) {
      setBanner(errorInfo(err).message);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      size="md"
      title={single ? `Assign a role to ${displayName(candidates[0])}` : 'Assign a role'}
      description={
        single
          ? 'Entra sent this person. You decide what they can do.'
          : 'Everyone you select gets the same role. You can change any of them later.'
      }
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => void submit()}
            loading={assign.isPending}
            disabled={!role || count === 0}
            leadingIcon={<ShieldCheck className="h-4 w-4" />}
          >
            {single || count <= 1 ? 'Assign role' : `Assign to ${count} people`}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {banner && <Banner tone="critical">{banner}</Banner>}

        {!single && (
          <div>
            <span className="mb-1.5 block text-[length:var(--fs-small)] font-medium text-text-secondary">
              Who
            </span>
            <ul className="divide-y divide-border rounded-[var(--r-md)] border border-border">
              {candidates.map((u) => (
                <li key={u.id}>
                  <label className="flex cursor-pointer items-center gap-2.5 px-3 py-2 hover:bg-surface-hover">
                    <Checkbox
                      checked={selected.has(u.id)}
                      onCheckedChange={() => toggle(u.id)}
                      aria-label={`Include ${displayName(u)}`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[length:var(--fs-small)] font-medium text-text">
                        {displayName(u)}
                      </span>
                      <span className="block truncate font-mono text-[length:var(--fs-micro)] text-text-tertiary">
                        {u.email}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            {count === 0 && (
              <p className="mt-1 text-[length:var(--fs-small)] text-[var(--crit-fg)]">
                Select at least one person.
              </p>
            )}
          </div>
        )}

        <div>
          <span className="mb-1.5 block text-[length:var(--fs-small)] font-medium text-text-secondary">
            Role
          </span>
          <Select
            value={role}
            onValueChange={setRole}
            options={roleOptions}
            placeholder="Select a role…"
            ariaLabel="Role"
            className="w-full"
          />
        </div>

        {role ? (
          <PermissionsSummary role={role as Role} />
        ) : (
          <InlineAlert tone="info">
            Pick a role to see exactly what it lets these people do.
          </InlineAlert>
        )}
      </div>
    </Dialog>
  );
}
