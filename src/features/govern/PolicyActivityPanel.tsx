import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ListChecks } from 'lucide-react';
import { usePolicyActions } from './queries';
import {
  OUTCOME_FILTERS,
  OUTCOME_LABELS,
  SWEEP_LABELS,
  failureSummary,
  filterByOutcome,
  groupIntoSweeps,
  outcomeCounts,
  type OutcomeFilter,
} from './policyActivity';
import { POLICY_ACTION_REASON_LABELS, type PolicyActionOutcome } from '@/mocks/types';
import type { PolicyActionWithIdentity } from '@/mocks/api';
import { Card } from '@/components/ui/Card';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { RiskPill } from '@/components/ui/RiskPill';
import { NhiTypeIcon } from '@/components/ui/NhiTypeIcon';
import { ProviderMark } from '@/components/ui/ProviderMark';
import { QueryBoundary } from '@/components/ui/QueryBoundary';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonTableRows } from '@/components/ui/Skeleton';
import { count, relativeTime } from '@/lib/format';
import { cn } from '@/lib/cn';

/**
 * Outcome → tone.
 *
 * `skipped` is deliberately neutral rather than critical: a guard declining to
 * act is the system working, and colouring it like a failure trains people to
 * "fix" the guard. `released` is info — a reversal is a state change worth
 * seeing, not a problem — and it is the most valuable row on the screen, because
 * a quarantine a person undid is the signal that the rule itself is wrong.
 */
const OUTCOME_TONE: Record<PolicyActionOutcome, BadgeTone> = {
  quarantined: 'success',
  failed: 'critical',
  skipped: 'neutral',
  released: 'info',
};

function ActionRow({ action }: { action: PolicyActionWithIdentity }) {
  return (
    <li className="border-b border-border px-3 py-2.5 last:border-b-0">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={OUTCOME_TONE[action.outcome]}>{OUTCOME_LABELS[action.outcome]}</Badge>
        <NhiTypeIcon type={action.identityType} className="h-3.5 w-3.5 shrink-0 text-text-tertiary" />
        <Link
          to={`/discover/${action.identityId}`}
          className="truncate font-mono text-[length:var(--fs-small)] text-text hover:underline"
        >
          {action.identityName}
        </Link>
        {/* An orphan is the case most worth catching: nobody would answer for
            what the rule did to it. Same flag the dry-run sample carries. */}
        {action.identityOrphaned && (
          <span
            className="text-[length:var(--fs-micro)] text-warn-fg"
            title="Orphaned — no accountable owner"
          >
            orphaned
          </span>
        )}
        <span className="flex items-center gap-1">
          {action.identityClouds.map((c) => (
            <ProviderMark key={c} cloud={c} className="h-3.5" />
          ))}
        </span>
        <RiskPill score={action.identityRiskScore} size="sm" />
        <span className="ml-auto whitespace-nowrap text-[length:var(--fs-micro)] text-text-tertiary">
          {relativeTime(action.at)}
        </span>
      </div>

      {action.reason && (
        <p
          className={cn(
            'mt-1 text-[length:var(--fs-small)]',
            action.outcome === 'failed' ? 'text-crit-fg' : 'text-text-secondary',
          )}
        >
          {POLICY_ACTION_REASON_LABELS[action.reason]}
        </p>
      )}
      {action.note && <p className="mt-1 text-[length:var(--fs-small)] text-text-secondary">{action.note}</p>}

      {/* Trigger and accountable. The policy is what you need first — which rule
          did this — and the person is whoever ACTIVATED it, stamped at the time
          rather than looked up, so a later reactivation by someone else cannot
          reassign responsibility for what already happened. */}
      <p className="mt-1 text-[length:var(--fs-micro)] text-text-tertiary">
        <Link to={`/govern/builder/${action.policyId}`} className="text-accent-text hover:underline">
          {action.policyName}
        </Link>
        {' · '}
        <span className="font-mono">{action.accountable}</span>
      </p>
    </li>
  );
}

/**
 * Every action the active policies have performed.
 *
 * Read-only by design: an entry is never edited, because a release is a new entry
 * pointing back at what it reverses. Only `quarantine` writes here — review and
 * alert mark rather than act, so they leave nothing with an outcome to report.
 */
export function PolicyActivityPanel() {
  const [filter, setFilter] = useState<OutcomeFilter>('all');
  const query = usePolicyActions();

  return (
    <QueryBoundary
      query={query}
      loadingFallback={
        <Card>
          <SkeletonTableRows rows={8} cols={3} />
        </Card>
      }
      isEmpty={(rows: PolicyActionWithIdentity[]) => rows.length === 0}
      empty={
        <Card>
          <EmptyState
            icon={<ListChecks className="h-5 w-5" />}
            headline="No policy has acted yet"
            guidance="Only an active quarantine policy records actions here. Flag-for-review and raise-an-alert policies mark identities rather than changing them, so they leave no entries."
          />
        </Card>
      }
    >
      {(rows: PolicyActionWithIdentity[]) => {
        const counts = outcomeCounts(rows);
        const summary = failureSummary(rows);
        const visible = filterByOutcome(rows, filter);
        const groups = groupIntoSweeps(visible);

        return (
          <div>
            {/* Leads for the same reason the dry-run card leads with its critical
                count: it is the number that decides whether to look closer. The
                shared-cause half is the actionable one — many rows, one fix. */}
            {summary.failed > 0 && (
              <p className="mb-3 flex items-baseline gap-1.5 text-[length:var(--fs-small)] text-crit-fg">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 translate-y-0.5" aria-hidden="true" />
                <span>
                  <span className="tnum font-semibold">{count(summary.failed)}</span> of{' '}
                  <span className="tnum">{count(summary.total)}</span> actions failed.
                  {summary.sharedCause > 0 && (
                    <>
                      {' '}
                      <span className="tnum">{count(summary.sharedCause)}</span> share the same cause.
                    </>
                  )}
                </span>
              </p>
            )}

            <div className="mb-3 flex flex-wrap items-center gap-1.5">
              {OUTCOME_FILTERS.map((f) => (
                <Button
                  key={f}
                  size="sm"
                  variant={filter === f ? 'secondary' : 'ghost'}
                  aria-pressed={filter === f}
                  onClick={() => setFilter(f)}
                >
                  {f === 'all' ? `All ${count(rows.length)}` : `${OUTCOME_LABELS[f]} ${count(counts[f])}`}
                </Button>
              ))}
            </div>

            {visible.length === 0 ? (
              <Card>
                <EmptyState
                  icon={<ListChecks className="h-5 w-5" />}
                  headline="No actions with that outcome"
                  guidance="Clear the filter to see the whole log."
                  action={
                    <Button size="sm" variant="secondary" onClick={() => setFilter('all')}>
                      Clear filter
                    </Button>
                  }
                />
              </Card>
            ) : (
              <div className="space-y-3">
                {groups.map((group) => (
                  <Card key={group.id}>
                    {/* A release is one person's act, not a run — it gets no
                        sweep header, because there is no sweep to describe. */}
                    {group.reason !== 'manual' && (
                      <div className="border-b border-border bg-surface-2 px-3 py-2">
                        <span className="eyebrow">{SWEEP_LABELS[group.reason]}</span>
                        <span className="ml-2 text-[length:var(--fs-small)] text-text-secondary">
                          {group.policyName} · <span className="tnum">{count(group.actions.length)}</span>{' '}
                          {group.actions.length === 1 ? 'action' : 'actions'} ·{' '}
                          <span className="tnum">{count(group.counts.failed)}</span> failed ·{' '}
                          {relativeTime(group.at)}
                        </span>
                      </div>
                    )}
                    <ul>
                      {group.actions.map((a) => (
                        <ActionRow key={a.id} action={a} />
                      ))}
                    </ul>
                  </Card>
                ))}
              </div>
            )}
          </div>
        );
      }}
    </QueryBoundary>
  );
}
