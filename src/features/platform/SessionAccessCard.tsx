import { AlertTriangle } from 'lucide-react';
import { useSessionPolicy, useUpdateSessionPolicy } from './queries';
import { ROLES, ROLE_LABELS, type Role } from '@/lib/permissions';
import { Badge } from '@/components/ui/Badge';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { QueryBoundary } from '@/components/ui/QueryBoundary';
import { Select } from '@/components/ui/Select';
import { SkeletonTableRows } from '@/components/ui/Skeleton';
import { Switch } from '@/components/ui/Switch';
import { useCan } from '@/components/ui/Can';
import { toast } from '@/stores/toast';
import { errorInfo } from '@/lib/apiError';

const IDLE_OPTIONS = [15, 30, 60, 120].map((m) => ({ value: String(m), label: `${m} minutes` }));
const ABSOLUTE_OPTIONS = [8, 12, 24].map((h) => ({ value: String(h), label: `${h} hours` }));

/** The actions the product already confirms before running. Named, not summarised. */
const SENSITIVE = 'Quarantine, emergency rotation, role change, user deletion';

/**
 * MFA requirement per role.
 *
 * Read-only on purpose. This asserts a policy the permission matrix does not yet
 * define, and an editable control would let an admin save something the
 * enforcement layer cannot honour — a setting that silently does nothing is
 * worse than one that admits it is not settable yet.
 * // ASSUMPTION: Architect-owned, pending the permission matrix.
 */
const MFA_BY_ROLE: Record<Role, string> = {
  'tenant-owner': 'Required',
  'tenant-admin': 'Required',
  'security-admin': 'Required',
  analyst: 'Required for sensitive actions',
  viewer: 'Optional',
};

export function SessionAccessCard() {
  const policy = useSessionPolicy();
  const update = useUpdateSessionPolicy();
  const canManage = useCan('settings.manage');

  const save = (patch: Parameters<typeof update.mutate>[0]) =>
    update.mutate(patch, {
      onSuccess: () => toast('Session policy updated', { tone: 'success' }),
      onError: (err) => toast(errorInfo(err).message, { tone: 'critical' }),
    });

  return (
    <Card className="lg:col-span-2">
      <CardHeader
        title="Sessions & access"
        description="How long a session lives, and what it takes to act inside one."
      />
      <CardBody>
        <QueryBoundary
          query={policy}
          loadingFallback={<SkeletonTableRows rows={4} cols={2} />}
          isEmpty={() => false}
        >
          {(p) => (
            <div className="divide-y divide-border">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-2.5">
                <span className="text-[length:var(--fs-small)] text-text">Idle timeout</span>
                <Select
                  value={String(p.idleTimeoutMinutes)}
                  onValueChange={(v) => save({ idleTimeoutMinutes: Number(v) })}
                  options={IDLE_OPTIONS}
                  ariaLabel="Idle timeout"
                  size="sm"
                  disabled={!canManage}
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                <span className="text-[length:var(--fs-small)] text-text">Absolute session limit</span>
                <Select
                  value={String(p.absoluteSessionHours)}
                  onValueChange={(v) => save({ absoluteSessionHours: Number(v) })}
                  options={ABSOLUTE_OPTIONS}
                  ariaLabel="Absolute session limit"
                  size="sm"
                  disabled={!canManage}
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                <span className="min-w-0">
                  <span className="block text-[length:var(--fs-small)] text-text">
                    Re-authenticate before sensitive actions
                  </span>
                  {/* Step-up is not the same as the confirm dialog these actions
                      already carry: one proves intent, the other proves identity. */}
                  <span className="block text-[length:var(--fs-micro)] text-text-tertiary">{SENSITIVE}</span>
                </span>
                <Switch
                  checked={p.stepUpOnSensitive}
                  onCheckedChange={(v) => save({ stepUpOnSensitive: v })}
                  disabled={!canManage}
                  ariaLabel="Re-authenticate before sensitive actions"
                />
              </div>
              <div className="pt-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[length:var(--fs-small)] text-text">MFA required by role</span>
                  <Badge tone="warning" icon={<AlertTriangle className="h-3 w-3" />}>
                    Read-only
                  </Badge>
                </div>
                <dl className="mt-2 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1">
                  {ROLES.map((role) => (
                    <div key={role} className="contents">
                      <dt className="text-[length:var(--fs-small)] text-text-tertiary">
                        {ROLE_LABELS[role]}
                      </dt>
                      <dd className="text-[length:var(--fs-small)] text-text-secondary">
                        {MFA_BY_ROLE[role]}
                      </dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-2 text-[length:var(--fs-micro)] text-text-tertiary">
                  Not settable yet: this asserts a policy the permission matrix does not define.
                  Making it editable before the matrix closes would let an admin save something
                  enforcement cannot honour.
                </p>
              </div>
            </div>
          )}
        </QueryBoundary>
      </CardBody>
    </Card>
  );
}
