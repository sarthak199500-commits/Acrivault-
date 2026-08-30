import { Link } from 'react-router-dom';
import { AlertTriangle, ListChecks } from 'lucide-react';
import { usePolicyActions } from './queries';
import { usePolicyFilters } from './usePolicyFilters';
import {
  OUTCOME_FILTERS,
  OUTCOME_LABELS,
  SWEEP_LABELS,
  failureSummary,
  filterByOutcome,
  filterByPolicy,
  groupIntoSweeps,
  outcomeCounts,
  policyFacets,
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
  const { policyId, setPolicyId, outcome, setOutcome } = usePolicyFilters();
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
        // Policy facets count the whole log, so a pill's number does not move as
        // you narrow by outcome. Outcome counts are scoped to the chosen policy,
        // because "5 failed" across every rule answers a question nobody asked
        // once you have already said which rule you care about.
        const facets = policyFacets(rows);
        const scoped = filterByPolicy(rows, policyId);
        const counts = outcomeCounts(scoped);
        const summary = failureSummary(scoped);
        const visible = filterByOutcome(scoped, outcome);
        const groups = groupIntoSweeps(visible);
        const chosen = facets.find((f) => f.id === policyId);

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

            {/* One rule needs no chooser — the pills would be a single button
                that changes nothing, and every row already names its policy. */}
            {facets.length > 1 && (
              <div className="mb-2 flex flex-wrap items-center gap-1.5">
                <span className="eyebrow mr-1">Policy</span>
                <Button
                  size="sm"
                  variant={policyId === null ? 'secondary' : 'ghost'}
                  aria-pressed={policyId === null}
                  onClick={() => setPolicyId(null)}
                >
                  All {count(rows.length)}
                </Button>
                {facets.map((f) => (
                  <Button
                    key={f.id}
                    size="sm"
                    variant={policyId === f.id ? 'secondary' : 'ghost'}
                    aria-pressed={policyId === f.id}
                    onClick={() => setPolicyId(f.id)}
                  >
                    {f.name} {count(f.count)}
                  </Button>
                ))}
              </div>
            )}

            {/* An outcome nothing produced gets no pill. Hiding on the count
                rather than naming one outcome keeps the rule general — Released
                is empty on a well-behaved policy too — and the pill reappears of
                its own accord the first time that outcome occurs. */}
            <div className="mb-3 flex flex-wrap items-center gap-1.5">
              <span className="eyebrow mr-1">Outcome</span>
              {OUTCOME_FILTERS.filter((f) => f === 'all' || counts[f] > 0).map((f) => (
                <Button
                  key={f}
                  size="sm"
                  variant={outcome === f ? 'secondary' : 'ghost'}
                  aria-pressed={outcome === f}
                  onClick={() => setOutcome(f)}
                >
                  {f === 'all' ? `All ${count(scoped.length)}` : `${OUTCOME_LABELS[f]} ${count(counts[f])}`}
                </Button>
              ))}
            </div>

            {visible.length === 0 ? (
              <Card>
                <EmptyState
                  icon={<ListChecks className="h-5 w-5" />}
                  headline="No actions match these filters"
                  guidance={
                    chosen && outcome !== 'all'
                      ? `${chosen.name} has recorded no ${OUTCOME_LABELS[outcome].toLowerCase()} actions.`
                      : 'Clear the filters to see the whole log.'
                  }
                  action={
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setPolicyId(null);
                        setOutcome('all');
                      }}
                    >
                      Clear filters
                    </Button>
                  }
                />
              </Card>
            ) : (
              <div className="space-y-3">
                {groups.map((group) => (
                  <Card key={group.id}>
                    {/* Every group gets a header, manual runs included. Without
                        one the newest rows — always releases, since a person
                        acts after the sweep — open the page with no context. */}
                    <div className="border-b border-border bg-surface-2 px-3 py-2">
                      <span className="eyebrow">{SWEEP_LABELS[group.reason]}</span>
                      <span className="ml-2 text-[length:var(--fs-small)] text-text-secondary">
                        {group.policyName && `${group.policyName} · `}
                        <span className="tnum">{count(group.actions.length)}</span>{' '}
                        {group.actions.length === 1 ? 'action' : 'actions'}
                        {/* "0 failed" is noise on a clean sweep. */}
                        {group.counts.failed > 0 && (
                          <>
                            {' · '}
                            <span className="tnum">{count(group.counts.failed)}</span> failed
                          </>
                        )}
                        {' · '}
                        {relativeTime(group.at)}
                      </span>
                    </div>
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
