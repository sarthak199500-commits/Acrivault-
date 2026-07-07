import { Link, useNavigate } from 'react-router-dom';
import { ListChecks, Plus } from 'lucide-react';
import { usePolicies } from './queries';
import type { Policy, PolicyStatus } from '@/mocks/types';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { buttonClasses } from '@/components/ui/Button';
import { QueryBoundary } from '@/components/ui/QueryBoundary';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonTableRows } from '@/components/ui/Skeleton';
import { useCan } from '@/components/ui/Can';
import { count, relativeTime } from '@/lib/format';

const STATUS_TONE: Record<PolicyStatus, BadgeTone> = {
  active: 'success',
  tested: 'info',
  draft: 'neutral',
};

function PolicyRow({ policy }: { policy: Policy }) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate(`/govern/builder/${policy.id}`)}
      className="flex w-full items-center gap-4 border-b border-border px-4 py-3 text-left last:border-b-0 hover:bg-surface-hover"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium text-text">{policy.name}</span>
          <Badge tone={STATUS_TONE[policy.status]} className="capitalize">{policy.status}</Badge>
        </div>
        <p className="mt-0.5 truncate text-[length:var(--fs-small)] text-text-secondary">{policy.plainEnglish}</p>
      </div>
      <div className="hidden shrink-0 text-right sm:block">
        <div className="tnum text-[length:var(--fs-body)] text-text">{count(policy.affectedCount)}</div>
        <div className="text-[length:var(--fs-micro)] text-text-tertiary">affected</div>
      </div>
      <div className="hidden w-28 shrink-0 text-right text-[length:var(--fs-small)] text-text-tertiary md:block">
        {relativeTime(policy.updatedAt)}
      </div>
    </button>
  );
}

export function PolicyListScreen() {
  const query = usePolicies();
  const canCreate = useCan('policy.create');

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
                <PolicyRow key={p.id} policy={p} />
              ))}
            </div>
          </Card>
        )}
      </QueryBoundary>
    </div>
  );
}
