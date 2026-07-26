import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ListChecks, Plus } from 'lucide-react';
import { usePolicies, useActivatePolicy, useArchivePolicy, useSuspendPolicy } from './queries';
import type { Policy, PolicyStatus } from '@/mocks/types';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Button, buttonClasses } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { QueryBoundary } from '@/components/ui/QueryBoundary';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonTableRows } from '@/components/ui/Skeleton';
import { useCan } from '@/components/ui/Can';
import { count, relativeTime } from '@/lib/format';
import { toast } from '@/stores/toast';
import { errorInfo } from '@/lib/apiError';

const STATUS_TONE: Record<PolicyStatus, BadgeTone> = {
  active: 'success',
  tested: 'info',
  draft: 'neutral',
  suspended: 'warning',
  archived: 'neutral',
};

/** Hover copy for each status, so the lifecycle is legible without leaving the list. */
const STATUS_HINT: Record<PolicyStatus, string> = {
  draft: 'Not tested or enforcing',
  tested: 'Dry-run passed; not yet enforcing',
  active: 'Enforcing now',
  suspended: 'Not enforcing; can be reactivated',
  archived: 'Retired; retained for audit',
};

type LifecycleAction = 'suspend' | 'reactivate' | 'archive';

const ACTION_COPY: Record<LifecycleAction, { verb: string; title: string; effect: string }> = {
  suspend: {
    verb: 'Suspend',
    title: 'Suspend this policy?',
    effect: 'Enforcement will stop immediately. The policy is not deleted and can be reactivated later.',
  },
  reactivate: {
    verb: 'Reactivate',
    title: 'Reactivate this policy?',
    effect: 'The policy will begin enforcing again against matching identities.',
  },
  archive: {
    verb: 'Archive',
    title: 'Archive this policy?',
    effect: 'It will be hidden from the default list but retained in the audit history. This cannot be undone.',
  },
};

function PolicyRow({
  policy,
  onAction,
  canManage,
}: {
  policy: Policy;
  onAction: (action: LifecycleAction, policy: Policy) => void;
  canManage: boolean;
}) {
  const navigate = useNavigate();
  // Archive is offered only from Suspended (FR-011) — not rendered at all on an
  // Active row rather than shown disabled.
  const actions: LifecycleAction[] = !canManage
    ? []
    : policy.status === 'active'
      ? ['suspend']
      : policy.status === 'suspended'
        ? ['reactivate', 'archive']
        : [];

  return (
    <div className="flex items-center gap-4 border-b border-border px-4 py-3 last:border-b-0 hover:bg-surface-hover">
      <button
        type="button"
        onClick={() => navigate(`/govern/builder/${policy.id}`)}
        className="min-w-0 flex-1 text-left"
      >
        <div className="flex items-center gap-2">
          <span className="truncate font-medium text-text">{policy.name}</span>
          <span className="inline-flex" title={STATUS_HINT[policy.status]}>
            <Badge tone={STATUS_TONE[policy.status]} className="capitalize">
              {policy.status}
            </Badge>
          </span>
        </div>
        <p className="mt-0.5 truncate text-[length:var(--fs-small)] text-text-secondary">{policy.plainEnglish}</p>
      </button>

      <div className="hidden shrink-0 text-right sm:block">
        <div className="tnum text-[length:var(--fs-body)] text-text">{count(policy.affectedCount)}</div>
        <div className="text-[length:var(--fs-micro)] text-text-tertiary">affected</div>
      </div>
      <div className="hidden w-28 shrink-0 text-right text-[length:var(--fs-small)] text-text-tertiary md:block">
        {relativeTime(policy.updatedAt)}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {actions.map((action) => (
          <Button
            key={action}
            size="sm"
            variant={action === 'archive' ? 'ghost' : 'secondary'}
            onClick={() => onAction(action, policy)}
          >
            {ACTION_COPY[action].verb}
          </Button>
        ))}
      </div>
    </div>
  );
}

export function PolicyListScreen() {
  const [includeArchived, setIncludeArchived] = useState(false);
  const query = usePolicies(includeArchived);
  const canCreate = useCan('policy.create');
  const canManage = useCan('policy.lifecycle');

  const [pending, setPending] = useState<{ action: LifecycleAction; policy: Policy } | null>(null);

  const suspend = useSuspendPolicy();
  const archive = useArchivePolicy();
  const activate = useActivatePolicy();
  const busy = suspend.isPending || archive.isPending || activate.isPending;

  const run = () => {
    if (!pending) return;
    const { action, policy } = pending;
    const mutation = action === 'suspend' ? suspend : action === 'archive' ? archive : activate;
    mutation.mutate(policy.id, {
      onSuccess: () => {
        setPending(null);
        toast(
          action === 'suspend'
            ? 'Policy suspended — enforcement stopped immediately'
            : action === 'archive'
              ? 'Policy archived'
              : 'Policy reactivated — now enforcing',
          { description: policy.name, tone: action === 'suspend' ? 'warning' : 'success' },
        );
      },
      onError: (err) => {
        setPending(null);
        toast(errorInfo(err).message, { tone: 'critical' });
      },
    });
  };

  return (
    <div>
      <ScreenHeader
        eyebrow="Know · Govern"
        title="Policies"
        description="Rules that govern non-human identities. Authoring and enforcement are illustrative in Wave 1."
        actions={
          canCreate ? (
            <Link to="/govern/builder" className={buttonClasses('primary', 'sm')}>
              <Plus className="h-4 w-4" aria-hidden="true" /> New policy
            </Link>
          ) : undefined
        }
      />

      <div className="mb-3 flex items-center justify-end">
        <Button size="sm" variant="ghost" onClick={() => setIncludeArchived((v) => !v)}>
          {includeArchived ? 'Hide archived' : 'Show archived'}
        </Button>
      </div>

      <QueryBoundary
        query={query}
        loadingFallback={
          <Card>
            <SkeletonTableRows rows={5} cols={3} />
          </Card>
        }
        isEmpty={(d) => d.length === 0}
        empty={
          <Card>
            <EmptyState
              icon={<ListChecks className="h-5 w-5" />}
              headline="No policies yet"
              guidance="Create your first policy to govern how identities are handled."
              action={
                canCreate ? (
                  <Link to="/govern/builder" className={buttonClasses('primary', 'md')}>
                    Create a policy
                  </Link>
                ) : undefined
              }
            />
          </Card>
        }
      >
        {(policies) => (
          <Card>
            <div>
              {policies.map((p) => (
                <PolicyRow
                  key={p.id}
                  policy={p}
                  canManage={canManage}
                  onAction={(action, policy) => setPending({ action, policy })}
                />
              ))}
            </div>
          </Card>
        )}
      </QueryBoundary>

      <Dialog
        open={!!pending}
        onOpenChange={(open) => !open && setPending(null)}
        title={pending ? ACTION_COPY[pending.action].title : ''}
        description={pending ? ACTION_COPY[pending.action].effect : ''}
        footer={
          <>
            <Button variant="ghost" onClick={() => setPending(null)}>Cancel</Button>
            <Button onClick={run} loading={busy}>
              {pending ? ACTION_COPY[pending.action].verb : ''}
            </Button>
          </>
        }
      >
        <p className="text-[length:var(--fs-small)] text-text-secondary">{pending?.policy.name}</p>
      </Dialog>
    </div>
  );
}
