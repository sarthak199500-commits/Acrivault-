import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, ArrowRight, Info, Send } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Banner } from '@/components/ui/Banner';
import { KeyValueList } from '@/components/ui/KeyValueList';
import { InlineAlert } from '@/components/ui/InlineAlert';
import { PermissionsSummary } from '@/components/ui/PermissionsSummary';
import { ValidityWindowField, validityWindowError } from '@/components/ui/ValidityWindowField';
import { assignableRoles, ROLE_LABELS, type Role } from '@/lib/permissions';
import { SSO_PROVIDER_LABELS, type User, type ValidityWindow } from '@/mocks/types';
import { PERSONAL_DOMAINS, domainOf } from '@/mocks/api';
import { useUiStore } from '@/stores/ui';
import { toast } from '@/stores/toast';
import { errorInfo } from '@/lib/apiError';
import { useGroups, useInviteUser, useResendInvite, useTenant, useUsers } from './queries';

type Step = 'form' | 'review';

export function InviteUserDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const actorRole = useUiStore((s) => s.role);
  const assignable = assignableRoles(actorRole);
  const users = useUsers();
  const groups = useGroups();
  const tenant = useTenant();
  const invite = useInviteUser();
  const resend = useResendInvite();

  const allowedDomains = useMemo(() => tenant.data?.allowedDomains ?? [], [tenant.data]);
  const provider = tenant.data?.sso.provider ?? 'entra';
  const ssoConfigured = tenant.data?.sso.configured ?? false;
  const groupList = groups.data ?? [];

  const schema = useMemo(
    () =>
      z.object({
        email: z
          .string()
          .min(1, 'Work email is required.')
          .email('Please enter a valid email address.')
          .refine(
            (e) => !PERSONAL_DOMAINS.includes(domainOf(e)),
            'Please use a work email address. Personal email domains are not accepted.',
          )
          .refine(
            (e) => allowedDomains.length === 0 || allowedDomains.includes(domainOf(e)),
            `This email domain is not configured for your organization's SSO. Please use a domain like @${allowedDomains[0] ?? 'yourcompany.com'}.`,
          ),
        role: z.string().min(1, 'Select a role.'),
        groupId: z.string().optional(),
      }),
    [allowedDomains],
  );

  type FormValues = z.infer<typeof schema>;
  const { register, handleSubmit, control, watch, reset, setError, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', role: '', groupId: '' },
    mode: 'onSubmit',
  });

  const [step, setStep] = useState<Step>('form');
  const [validity, setValidity] = useState<ValidityWindow | undefined>();
  const [dupPending, setDupPending] = useState<User | null>(null);
  const [sendBanner, setSendBanner] = useState<{ tone: 'warning' | 'critical'; msg: string } | null>(null);

  useEffect(() => {
    if (open) {
      reset({ email: '', role: '', groupId: '' });
      setStep('form');
      setValidity(undefined);
      setDupPending(null);
      setSendBanner(null);
    }
  }, [open, reset]);

  const values = watch();
  const validityErr = validityWindowError(validity);

  const onReview = handleSubmit((vals) => {
    setDupPending(null);
    const email = vals.email.trim().toLowerCase();
    const existing = (users.data ?? []).find((u) => u.email === email);
    if (existing) {
      if (existing.status === 'pending' || existing.status === 'invited') {
        setDupPending(existing);
        return;
      }
      setError('email', { message: 'A user with this email already exists in your organization.' });
      return;
    }
    if (validityErr) return;
    setStep('review');
  });

  const role = (values.role || 'viewer') as Role;
  const groupName = groupList.find((g) => g.id === values.groupId)?.name;
  const authMethodLabel = ssoConfigured
    ? `SSO via ${SSO_PROVIDER_LABELS[provider]}`
    : 'Email + Password (fallback) — MFA enrollment required';

  const send = async () => {
    setSendBanner(null);
    const email = values.email.trim().toLowerCase();
    try {
      const res = await invite.mutateAsync({
        email,
        role,
        groups: values.groupId ? [values.groupId] : [],
        validity,
      });
      if (res.emailFailed) {
        setSendBanner({
          tone: 'warning',
          msg: 'User created successfully, but we could not send the invitation email. Please try resending the invite from the user list.',
        });
      } else {
        toast(`Invitation sent to ${email}!`, { tone: 'success' });
        onOpenChange(false);
      }
    } catch (err) {
      setSendBanner({ tone: 'critical', msg: errorInfo(err).message });
    }
  };

  const resendForDuplicate = async () => {
    if (!dupPending) return;
    try {
      await resend.mutateAsync(dupPending.id);
      toast(`Invitation re-sent to ${dupPending.email}!`, { tone: 'success' });
      onOpenChange(false);
    } catch (err) {
      toast(errorInfo(err).message, { tone: 'critical' });
    }
  };

  const roleOptions = assignable.map((r) => ({ value: r, label: ROLE_LABELS[r] }));
  const groupOptions = [
    { value: '', label: 'No group' },
    ...groupList.map((g) => ({ value: g.id, label: g.name })),
  ];

  const footer =
    step === 'form' ? (
      <>
        <Button variant="ghost" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button onClick={onReview} trailingIcon={<ArrowRight className="h-4 w-4" />}>
          Review invitation
        </Button>
      </>
    ) : (
      <>
        <Button variant="ghost" onClick={() => setStep('form')} leadingIcon={<ArrowLeft className="h-4 w-4" />}>
          Back
        </Button>
        <Button onClick={send} loading={invite.isPending} leadingIcon={<Send className="h-4 w-4" />}>
          Send invitation
        </Button>
      </>
    );

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      size="md"
      title="Invite user"
      description={
        step === 'form'
          ? 'Only email and role are required. Name and profile details come from your identity provider.'
          : 'Review the invitation before sending.'
      }
      footer={footer}
    >
      {step === 'form' ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void onReview();
          }}
          noValidate
          className="space-y-4"
        >
          <Input
            label="Work email"
            type="email"
            placeholder="teammate@acme.com"
            error={formState.errors.email?.message}
            {...register('email')}
          />

          {dupPending && (
            <InlineAlert tone="warning" title="Already invited.">
              {dupPending.email} has a pending invitation.{' '}
              <button
                type="button"
                onClick={resendForDuplicate}
                className="font-medium text-accent-text underline disabled:opacity-50"
                disabled={resend.isPending}
              >
                Resend invitation
              </button>
            </InlineAlert>
          )}

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
                  placeholder="Select a role…"
                  ariaLabel="Role"
                  className="w-full"
                />
              )}
            />
            {formState.errors.role ? (
              <p className="mt-1 text-[length:var(--fs-small)] text-[var(--crit-fg)]">
                {formState.errors.role.message}
              </p>
            ) : (
              <p className="mt-1 inline-flex items-center gap-1 text-[length:var(--fs-small)] text-text-tertiary">
                <Info className="h-3.5 w-3.5" aria-hidden="true" />
                A role defines what this user can see and do.
              </p>
            )}
          </div>

          <div>
            <span className="mb-1 block text-[length:var(--fs-small)] font-medium text-text-secondary">
              Group <span className="font-normal text-text-tertiary">(optional)</span>
            </span>
            {groupList.length === 0 ? (
              <p className="text-[length:var(--fs-small)] text-text-tertiary">
                No groups configured.{' '}
                <Link to="/settings/groups" className="font-medium text-accent-text hover:underline">
                  You can create a group.
                </Link>
              </p>
            ) : (
              <Controller
                name="groupId"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ?? ''}
                    onValueChange={field.onChange}
                    options={groupOptions}
                    placeholder="Select a group…"
                    ariaLabel="Group"
                    className="w-full"
                  />
                )}
              />
            )}
          </div>

          <ValidityWindowField value={validity} onChange={setValidity} />
        </form>
      ) : (
        <div className="space-y-4">
          {sendBanner && <Banner tone={sendBanner.tone}>{sendBanner.msg}</Banner>}

          <KeyValueList
            boxed
            items={[
              { label: 'Email', value: values.email.trim().toLowerCase() },
              { label: 'Role', value: ROLE_LABELS[role] },
              { label: 'Group', value: groupName ?? 'None' },
              {
                label: 'Access window',
                value:
                  validity?.start || validity?.expiry
                    ? `${validity?.start?.slice(0, 10) ?? '—'} → ${validity?.expiry?.slice(0, 10) ?? '—'}`
                    : 'No expiry',
              },
              { label: 'Authentication', value: authMethodLabel },
            ]}
          />

          <PermissionsSummary role={role} />
        </div>
      )}
    </Dialog>
  );
}
