import { useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Archive, ListChecks, MoreHorizontal, Pause, Play, Plus, X } from 'lucide-react';
import {
  usePolicies,
  usePolicyAudit,
  useActivatePolicy,
  useArchivePolicy,
  useSuspendPolicy,
} from './queries';
import {
  LIVE_POLICY_STATUSES,
  POLICY_SORT_OPTIONS,
  archiveRecords,
  inlineAction,
  overflowActions,
  policiesForTab,
  policyCountLabel,
  selectPolicies,
  statusCounts,
  type ArchiveRecord,
  type LifecycleAction,
  type PolicySort,
} from './policyList';
import { usePolicyFilters } from './usePolicyFilters';
import { PolicyActivityPanel } from './PolicyActivityPanel';
import { type Policy, type PolicyStatus } from '@/mocks/types';
import { Tabs, TabPanel } from '@/components/ui/Tabs';
import { IconButton } from '@/components/ui/IconButton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Button, buttonClasses } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { DebouncedSearch } from '@/components/ui/DebouncedSearch';
import { FilterMenu } from '@/components/ui/FilterMenu';
import { Select } from '@/components/ui/Select';
import { QueryBoundary } from '@/components/ui/QueryBoundary';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonTableRows } from '@/components/ui/Skeleton';
import { useCan } from '@/components/ui/Can';
import { count, date, relativeTime } from '@/lib/format';
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

/**
 * Suspend and Reactivate are opposite actions that never share a row, so as two
 * identical secondary pills they were only distinguishable by reading the label.
 * The icon carries the direction — and does it on a channel that survives both
 * colour-vision differences and a quick scan down the column.
 */
const ACTION_COPY: Record<
  LifecycleAction,
  { verb: string; title: string; effect: string; icon: ReactNode }
> = {
  suspend: {
    verb: 'Suspend',
    title: 'Suspend this policy?',
    effect: 'Enforcement will stop immediately. The policy is not deleted and can be reactivated later.',
    icon: <Pause className="h-3.5 w-3.5" />,
  },
  reactivate: {
    verb: 'Reactivate',
    title: 'Reactivate this policy?',
    effect: 'The policy will begin enforcing again against matching identities.',
    icon: <Play className="h-3.5 w-3.5" />,
  },
  archive: {
    verb: 'Archive',
    title: 'Archive this policy?',
    effect: 'It will be hidden from the default list but retained in the audit history. This cannot be undone.',
    icon: <Archive className="h-3.5 w-3.5" />,
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
  // The reversible step sits inline; Archive goes to the overflow because it cannot
  // be undone. Unavailable actions are absent rather than shown disabled.
  const inline = canManage ? inlineAction(policy.status) : null;
  const overflow = canManage ? overflowActions(policy.status) : [];

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

      {/* Every trailing column is a fixed track: content-sized boxes would let a
          row's action buttons shove its neighbours sideways, so no two rows would
          share a right edge. w-36 also keeps "activated 2 months ago" on one line,
          which keeps row heights level. */}
      <div className="hidden w-16 shrink-0 text-right sm:block">
        <div className="tnum text-[length:var(--fs-body)] text-text">{count(policy.affectedCount)}</div>
        <div className="text-[length:var(--fs-micro)] text-text-tertiary">affected</div>
        {/* Two different denominators: "affected" is who matches NOW, the action
            log is what was done OVER TIME. Labelled rather than a second bare
            number, which would read as more of the same count.
            stopPropagation because the row itself navigates to the builder. */}
        {policy.activatedAt && (
          <Link
            to={`/govern?tab=activity&policy=${policy.id}`}
            onClick={(e) => e.stopPropagation()}
            className="text-[length:var(--fs-micro)] text-accent-text hover:underline"
          >
            View actions
          </Link>
        )}
      </div>
      <div className="hidden w-36 shrink-0 text-right md:block">
        <div className="text-[length:var(--fs-small)] text-text-tertiary">{relativeTime(policy.updatedAt)}</div>
        <div className="text-[length:var(--fs-micro)] text-text-tertiary">
          {policy.activatedAt ? `activated ${relativeTime(policy.activatedAt)}` : 'never activated'}
        </div>
      </div>

      {/* Reserved from sm up so rows without actions keep the gutter and every row
          shares a right edge; below that the row is too narrow to spend 8.5rem on
          an empty column. Sized to one inline verb plus the overflow trigger — the
          irreversible action moving into the menu is what let this shrink. */}
      <div className="flex shrink-0 items-center gap-1 sm:w-40 sm:justify-end">
        {inline && (
          <Button
            size="sm"
            variant="secondary"
            leadingIcon={ACTION_COPY[inline].icon}
            onClick={() => onAction(inline, policy)}
          >
            {ACTION_COPY[inline].verb}
          </Button>
        )}
        {/* No trigger at all when the menu would be empty — an Active row's only
            action is inline, and a read-only role has none. */}
        {overflow.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <IconButton label={`More actions for ${policy.name}`} size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </IconButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {overflow.map((action) => (
                <DropdownMenuItem key={action} onSelect={() => onAction(action, policy)}>
                  <span className="flex items-center gap-2">
                    {ACTION_COPY[action].icon}
                    {ACTION_COPY[action].verb}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}

/**
 * Archiving a rule that never enforced isn't a retirement, and telling someone
 * enforcement "will stop" when it never started is just wrong. The irreversibility
 * is the part that matters in both cases, so both say it.
 */
function archiveEffect(policy: Policy): string {
  return policy.activatedAt
    ? ACTION_COPY.archive.effect
    : 'This policy never enforced, so no identity is affected. It is retained in the audit history and hidden from the policy list. This cannot be undone.';
}

/**
 * An archive row is a record, not a control: archived policies cannot be edited,
 * activated, or restored, so this renders no lifecycle buttons and does not link
 * into the builder. Its columns answer the audit question — when, and by whom.
 */
function ArchiveRow({ record }: { record: ArchiveRecord }) {
  const { policy, at, by, enforced } = record;
  return (
    <div className="flex items-center gap-4 border-b border-border px-4 py-3 last:border-b-0">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium text-text">{policy.name}</span>
          {/* The archive holds two different things; saying which keeps it from
              reading as though every entry once governed identities. */}
          <span
            className="inline-flex"
            title={
              enforced
                ? 'Enforced at some point, then retired'
                : 'Archived before it ever enforced'
            }
          >
            <Badge tone={enforced ? 'warning' : 'neutral'}>
              {enforced ? 'Retired' : 'Discarded'}
            </Badge>
          </span>
        </div>
        <p className="mt-0.5 truncate text-[length:var(--fs-small)] text-text-secondary">
          {policy.plainEnglish}
        </p>
      </div>
      <div className="hidden w-28 shrink-0 text-right sm:block">
        <div className="text-[length:var(--fs-small)] text-text-tertiary">{date(at)}</div>
        <div className="text-[length:var(--fs-micro)] text-text-tertiary">
          {enforced ? 'archived' : 'never enforced'}
        </div>
      </div>
      <div className="hidden w-52 shrink-0 text-right md:block">
        <div className="truncate text-[length:var(--fs-small)] text-text-tertiary">{by ?? '—'}</div>
        <div className="text-[length:var(--fs-micro)] text-text-tertiary">
          {by ? 'archived by' : 'not attributed'}
        </div>
      </div>
    </div>
  );
}

export function PolicyListScreen() {
  // Archived rows are fetched so the Archive tab's count is live on both tabs.
  const query = usePolicies(true);
  const audit = usePolicyAudit();
  const filters = usePolicyFilters();
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
              guidance="Start with a common pattern or build your own."
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
        {(policies) => {
          const live = policiesForTab(policies, 'live');
          const retired = policiesForTab(policies, 'archive');
          const counts = statusCounts(live);
          const rows = selectPolicies(
            filters.tab === 'archive' ? retired : live,
            filters.filter,
          );
          const records = archiveRecords(rows, audit.data ?? []);
          return (
            <Tabs
              value={filters.tab}
              onValueChange={filters.setTab}
              tabs={[
                { value: 'live', label: `Policies (${count(live.length)})` },
                { value: 'archive', label: `Archive (${count(retired.length)})` },
                // No count: the other two count policies, and a third number in
                // the same bar counting a different entity would read as one too.
                { value: 'activity', label: 'Activity' },
              ]}
            >
              <TabPanel value="live">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <div className="min-w-64 flex-1">
                    <DebouncedSearch
                      label="Search policies"
                      placeholder="Search by name or rule…"
                      value={filters.filter.search}
                      onChange={filters.setSearch}
                    />
                  </div>

                  <FilterMenu
                    label="Status"
                    options={LIVE_POLICY_STATUSES.map((s) => ({
                      value: s,
                      label: s[0].toUpperCase() + s.slice(1),
                      count: counts[s],
                    }))}
                    selected={filters.filter.statuses}
                    onToggle={(v) => filters.toggleStatus(v as PolicyStatus)}
                    onClear={() => filters.filter.statuses.forEach((s) => filters.toggleStatus(s))}
                  />

                  {/* Default size (h-9) so it lines up with the search field and the
                      status trigger; size="sm" left it 4px short of both. */}
                  <Select
                    value={filters.filter.sort}
                    onValueChange={(v) => filters.setSort(v as PolicySort)}
                    options={POLICY_SORT_OPTIONS}
                    ariaLabel="Sort policies by"
                    className="min-w-40"
                  />

                  {filters.activeCount > 0 && (
                    <button
                      type="button"
                      onClick={filters.clearAll}
                      className="inline-flex h-8 items-center gap-1.5 rounded-[var(--r-sm)] px-2.5 text-[length:var(--fs-small)] text-text-secondary hover:bg-surface-hover hover:text-text"
                    >
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                      Clear ({filters.activeCount})
                    </button>
                  )}
                </div>

                <p className="mb-2 text-[length:var(--fs-small)] text-text-tertiary" aria-live="polite">
                  {policyCountLabel(rows, live)}
                </p>

                <Card>
                  {rows.length === 0 ? (
                    <EmptyState
                      icon={<ListChecks className="h-5 w-5" />}
                      headline="No policies match these filters"
                      guidance="Try a different search term or clear the status filter."
                      action={
                        <Button variant="secondary" size="sm" onClick={filters.clearAll}>
                          Clear filters
                        </Button>
                      }
                    />
                  ) : (
                    <div>
                      {rows.map((p) => (
                        <PolicyRow
                          key={p.id}
                          policy={p}
                          canManage={canManage}
                          onAction={(action, policy) => setPending({ action, policy })}
                        />
                      ))}
                    </div>
                  )}
                </Card>
              </TabPanel>

              <TabPanel value="archive">
                <div className="mb-3 min-w-64 max-w-md">
                  <DebouncedSearch
                    label="Search the archive"
                    placeholder="Search by name or rule…"
                    value={filters.filter.search}
                    onChange={filters.setSearch}
                  />
                </div>

                <p className="mb-2 text-[length:var(--fs-small)] text-text-tertiary" aria-live="polite">
                  {policyCountLabel(rows, retired)} · retained for audit, newest first. Archived
                  policies cannot be edited, activated, or restored.
                </p>

                <Card>
                  {records.length === 0 ? (
                    <EmptyState
                      icon={<Archive className="h-5 w-5" />}
                      headline={
                        filters.filter.search ? 'Nothing in the archive matches' : 'Nothing archived yet'
                      }
                      guidance={
                        filters.filter.search
                          ? 'Try a different search term.'
                          : 'Suspending a policy stops enforcement; archiving it retires the policy for good.'
                      }
                      action={
                        filters.filter.search ? (
                          <Button variant="secondary" size="sm" onClick={filters.clearAll}>
                            Clear search
                          </Button>
                        ) : undefined
                      }
                    />
                  ) : (
                    <div>
                      {records.map((r) => (
                        <ArchiveRow key={r.policy.id} record={r} />
                      ))}
                    </div>
                  )}
                </Card>
              </TabPanel>

              <TabPanel value="activity">
                <PolicyActivityPanel />
              </TabPanel>
            </Tabs>
          );
        }}
      </QueryBoundary>

      <Dialog
        open={!!pending}
        onOpenChange={(open) => !open && setPending(null)}
        title={pending ? ACTION_COPY[pending.action].title : ''}
        description={
          pending
            ? pending.action === 'archive'
              ? archiveEffect(pending.policy)
              : ACTION_COPY[pending.action].effect
            : ''
        }
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
