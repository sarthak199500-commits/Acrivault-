import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Banner } from '@/components/ui/Banner';
import { KeyValueList } from '@/components/ui/KeyValueList';
import { InlineAlert } from '@/components/ui/InlineAlert';
import { ValidityWindowField, validityWindowError } from '@/components/ui/ValidityWindowField';
import { assignableRoles, ROLE_LABELS, type Role } from '@/lib/permissions';
import { displayName, isIdpManaged } from '@/lib/user';
import type { User, ValidityWindow } from '@/mocks/types';
import { useUiStore } from '@/stores/ui';
import { toast } from '@/stores/toast';
import { errorInfo } from '@/lib/apiError';
import { useEditUser } from './queries';

const schema = z.object({ role: z.string().min(1, 'Select a role.') });
type FormValues = z.infer<typeof schema>;

export function EditUserDialog({
  open,
  onOpenChange,
  user,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
}) {
  const actorRole = useUiStore((s) => s.role);
  const assignable = assignableRoles(actorRole);
  const edit = useEditUser();

  const { control, handleSubmit, reset, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { role: user?.role ?? '' },
  });

  const [validity, setValidity] = useState<ValidityWindow | undefined>();
  const [banner, setBanner] = useState<string | undefined>();

  useEffect(() => {
    if (open && user) {
      reset({ role: user.role ?? '' });
      setValidity(user.validity);
      setBanner(undefined);
    }
  }, [open, user, reset]);

  // A role we can't otherwise assign (e.g. the subject already outranks us) must
  // still appear so the current value renders correctly.
  const roleOptions = useMemo(() => {
    const set = new Set(assignable);
    if (user?.role) set.add(user.role);
    return assignableRoles('tenant-admin')
      .filter((r) => set.has(r))
      .map((r) => ({ value: r, label: ROLE_LABELS[r] }));
  }, [assignable, user]);

  if (!user) return null;

  const validityErr = validityWindowError(validity);

  const save = handleSubmit(async (vals) => {
    setBanner(undefined);
    if (validityErr) return;
    try {
      await edit.mutateAsync({
        id: user.id,
        patch: { role: vals.role as Role, validity },
      });
      toast(`${displayName(user)}’s access was updated.`, { tone: 'success' });
      onOpenChange(false);
    } catch (err) {
      setBanner(errorInfo(err).message);
    }
  });

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      size="md"
      title={`Edit ${displayName(user)}`}
      description="Change role and access window. Name and email come from Microsoft Entra ID."
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void save()} loading={edit.isPending}>
            Save changes
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {banner && <Banner tone="critical">{banner}</Banner>}

        <KeyValueList
          boxed
          items={[
            { label: 'Name', value: <span className="font-medium">{displayName(user)}</span> },
            { label: 'Email', value: user.email, mono: true },
            {
              label: 'Managed by',
              value: isIdpManaged(user)
                ? 'Microsoft Entra ID'
                : 'Acrivault — this account signs in with a password',
            },
          ]}
        />

        <div>
          <span className="mb-1 block text-[length:var(--fs-small)] font-medium text-text-secondary">Role</span>
          <Controller
            name="role"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={field.onChange}
                options={roleOptions}
                ariaLabel="Role"
                className="w-full"
              />
            )}
          />
          {formState.errors.role && (
            <p className="mt-1 text-[length:var(--fs-small)] text-[var(--crit-fg)]">
              {formState.errors.role.message}
            </p>
          )}
        </div>

        {user.role === null && (
          <InlineAlert tone="warning" title="No role yet.">
            Entra provisioned this account. Until a role is set they can sign in but see nothing.
          </InlineAlert>
        )}

        {user.status === 'suspended' && (
          <InlineAlert tone="info">
            This user is suspended — role changes take effect when they’re reactivated.
          </InlineAlert>
        )}

        {user.status === 'suspended-idp' && (
          <InlineAlert tone="info" title="Suspended in Entra.">
            Entra deactivated this account, so only Entra can restore it. Changes here apply if it
            comes back.
          </InlineAlert>
        )}

        <ValidityWindowField value={validity} onChange={setValidity} />
      </div>
    </Dialog>
  );
}
