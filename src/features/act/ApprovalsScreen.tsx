import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardCheck, Gavel, ShieldX, Sparkles, UserRound } from 'lucide-react';
import { useApprovals, useDecideApproval } from './queries';
import { ApprovalsToolbar } from './ApprovalsToolbar';
import { applyApprovalFilter, useApprovalFilters } from './useApprovalFilters';
import { approvalsEmptyCopy } from './approvalsEmptyCopy';
import type { ApprovalOutcome, ApprovalWithContext } from '@/mocks/api';
import { NHI_TYPE_LABELS } from '@/mocks/types';
import { screenHeaderProps } from '@/app/nav';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { QueryBoundary } from '@/components/ui/QueryBoundary';
import { RoleRestricted } from '@/components/ui/RoleRestricted';
import { SkeletonText } from '@/components/ui/Skeleton';
import { Textarea } from '@/components/ui/Textarea';
import { useCan } from '@/components/ui/Can';
import { cn } from '@/lib/cn';
import { count, dateTime, relativeTime } from '@/lib/format';
import { toast } from '@/stores/toast';
import { errorInfo } from '@/lib/apiError';

/** Which decision a confirmation dialog is holding, and about what. */
type Decision = { id: string; identityName: string; outcome: 'approved' | 'declined' };

/**
 * What an approver decided, and why, on a row that is no longer actionable.
 *
 * An inset panel rather than a second left-ruled blockquote: the requester's
 * reason above IS a quotation, and this is the answer to it. Giving both the
 * same treatment would read as two peer quotes rather than a question and its
 * reply.
 */
function DecisionPanel({ request }: { request: ApprovalWithContext }) {
  // Bound to a local so the narrowing survives into the JSX below; a narrowed
  // property access does not, and a non-null assertion is banned.
  const decided = request.decided;
  if (!decided) return null;
  return (
    <div className="mt-3 max-w-2xl rounded-[var(--r-md)] border border-border bg-surface-2 px-3 py-2.5">
      <p className="flex flex-wrap items-center gap-1.5 text-[length:var(--fs-small)] text-text">
        <Gavel className="h-3.5 w-3.5 shrink-0 text-text-tertiary" aria-hidden="true" />
        <span className="font-medium">
          {request.status === 'approved' ? 'Approved' : 'Declined'} by {request.deciderName}
        </span>
        <span className="text-text-tertiary">· {request.deciderRole} ·</span>
        <span className="tnum text-text-tertiary" title={dateTime(decided.at)}>
          {relativeTime(decided.at)}
        </span>
      </p>
      {decided.note && (
        <p className="mt-1.5 text-[length:var(--fs-small)] leading-[18px] text-text-secondary">
          {decided.note}
        </p>
      )}
    </div>
  );
}

function RequestRow({
  request,
  canDecide,
  onDecide,
}: {
  request: ApprovalWithContext;
  canDecide: boolean;
  onDecide: (decision: Decision) => void;
}) {
  const pending = request.status === 'pending';
  return (
    <li
      className={cn(
        'border-b border-border px-5 py-4 last:border-b-0',
        // A decided row recedes so the pending rows above it keep the weight in
        // the All view. This is the price of putting the record on the worklist
        // rather than on a screen of its own, and it is paid here.
        !pending && 'bg-surface-2/40',
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to={`/discover/${request.identityId}`}
              className={cn(
                'font-mono text-[length:var(--fs-body)] hover:underline',
                pending ? 'text-text' : 'text-text-secondary',
              )}
            >
              {request.identityName}
            </Link>
            <Badge tone="neutral">{NHI_TYPE_LABELS[request.identityType]}</Badge>
            {/* Approved is `critical` and declined is `neutral` on purpose: the
                tone tracks whether state actually CHANGED. An approval contained
                an identity; a decline left it exactly as it was, which is what
                the screen's own description promises. */}
            {!pending && (
              <Badge tone={request.status === 'approved' ? 'critical' : 'neutral'}>
                {request.status === 'approved' ? 'Approved' : 'Declined'}
              </Badge>
            )}
          </div>
          {/* The requester and their ROLE together: an approver has to be able to
              see that the person asking holds propose-only rights, which is the
              whole reason the request reached them. */}
          <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[length:var(--fs-small)] text-text-secondary">
            <UserRound className="h-3.5 w-3.5 shrink-0 text-text-tertiary" aria-hidden="true" />
            <span>
              {request.requesterName} · {request.requesterRole}
            </span>
            <span className="text-text-tertiary" aria-hidden="true">
              ·
            </span>
            <span className="tnum text-text-tertiary" title={dateTime(request.requestedAt)}>
              {relativeTime(request.requestedAt)}
            </span>
          </p>
          {request.reason ? (
            <p className="mt-2 max-w-2xl border-l-2 border-border-strong pl-3 text-[length:var(--fs-small)] text-text-secondary">
              {request.reason}
            </p>
          ) : (
            <p className="mt-2 text-[length:var(--fs-small)] italic text-text-tertiary">
              No reason given.
            </p>
          )}
          {/* The evidence, where there is any: a proposal raised from a replay
              names the session that prompted it, so the approver can read the
              behaviour rather than take the reason on trust. */}
          {request.fromSessionId && (
            <Link
              to={`/intelligence/${request.fromSessionId}`}
              className="mt-2 inline-flex items-center gap-1.5 text-[length:var(--fs-small)] text-accent-text hover:underline"
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Raised from session {request.fromSessionId}
            </Link>
          )}
          <DecisionPanel request={request} />
        </div>

        {canDecide && pending && (
          <div className="flex shrink-0 items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                onDecide({ id: request.id, identityName: request.identityName, outcome: 'declined' })
              }
            >
              Decline
            </Button>
            <Button
              size="sm"
              variant="danger"
              leadingIcon={<ShieldX className="h-3.5 w-3.5" />}
              onClick={() =>
                onDecide({ id: request.id, identityName: request.identityName, outcome: 'approved' })
              }
            >
              Approve
            </Button>
          </div>
        )}
      </div>
    </li>
  );
}

/**
 * Act > Approvals (audit point 7).
 *
 * The permission model already splits proposing a quarantine
 * (`session.quarantineRecommend`, the Analyst) from carrying it out
 * (`session.quarantine`, Security Admin and above). Until this screen existed
 * the proposal had nowhere to land: `requestApproval` wrote an audit line
 * reading "Awaiting an admin decision" and the admin had no queue to await it
 * in. Approving here runs the same containment a direct quarantine does, and
 * records the APPROVER as the identity's producer — they are answerable for the
 * state, not the analyst who asked.
 *
 * Quarantine is the ONLY action in this queue, on purpose. See the
 * ApprovalRequest doc comment in mocks/types.ts for why rotation is not a second
 * member, and the empty state below for what it tells the reader.
 */
export function ApprovalsScreen() {
  const query = useApprovals();
  const filters = useApprovalFilters();
  const decide = useDecideApproval();
  const canDecide = useCan('session.quarantine');
  const canPropose = useCan('session.quarantineRecommend');
  const [confirm, setConfirm] = useState<Decision | null>(null);
  const [note, setNote] = useState('');

  // Memoised for the same reason QuarantineScreen memoises its own: `?? []`
  // builds a fresh array on every render while the query is still loading, which
  // would make the filter below recompute forever.
  const all = useMemo(() => query.data ?? [], [query.data]);
  const rows = useMemo(() => applyApprovalFilter(all, filters.filter), [all, filters.filter]);
  // Counted over the whole permitted set, not `rows`: the badge answers "how
  // much is waiting on me", which does not change because the reader switched
  // to Declined. The old expression was `query.data.length`, correct only while
  // the query fetched nothing but pending.
  const pendingCount = all.filter((a) => a.status === 'pending').length;

  /** Closing the dialog drops the draft, so a reason typed for one request can
   *  never be submitted against another. */
  const closeDialog = () => {
    setConfirm(null);
    setNote('');
  };

  const runDecision = () => {
    if (!confirm) return;
    const outcome: ApprovalOutcome =
      confirm.outcome === 'approved' ? { decision: 'approved' } : { decision: 'declined', note };
    decide.mutate(
      { id: confirm.id, outcome },
      {
        onSuccess: () => {
          toast(
            confirm.outcome === 'approved'
              ? `${confirm.identityName} quarantined`
              : `Request declined for ${confirm.identityName}`,
            {
              tone: confirm.outcome === 'approved' ? 'critical' : 'default',
              description:
                confirm.outcome === 'approved'
                  ? 'You are recorded as the approver. Synthetic — no upstream state changes.'
                  : 'The identity was left as it was. Your reason is on the request.',
            },
          );
          closeDialog();
        },
        onError: (err) => toast(errorInfo(err).message, { tone: 'critical' }),
      },
    );
  };

  return (
    <div>
      <ScreenHeader
        {...screenHeaderProps('/act/approvals')}
        badge={
          pendingCount > 0 ? (
            <Badge tone="warning" className="tnum">
              {count(pendingCount)} pending
            </Badge>
          ) : undefined
        }
        description="Quarantines an Analyst has proposed and an admin has yet to decide. Approving contains the identity and records you as the approver; declining leaves it exactly as it is, with your reason. Either way the decision is written to the audit log."
      />

      {!canDecide && (
        <div className="mb-4">
          <RoleRestricted
            note={
              canPropose
                ? 'Your role can propose a quarantine and see what is waiting, but not decide it. Contact a Security Admin.'
                : 'Your role can see what is waiting but neither propose nor decide a quarantine. Contact a Security Admin.'
            }
          />
        </div>
      )}

      {/* Above the boundary, not inside it: a filter you cannot clear because
          the list it emptied has been replaced by an empty state is a trap.
          Gated on there being anything at all to filter. */}
      {all.length > 0 && (
        <div className="mb-4">
          <ApprovalsToolbar filters={filters} rows={all} />
        </div>
      )}

      <QueryBoundary
        query={query}
        loadingFallback={
          <Card className="px-5 py-4">
            <SkeletonText lines={6} />
          </Card>
        }
        // Both of these read the FILTERED rows, not the boundary's own data:
        // what the screen shows is `rows`, and an empty state keyed on the raw
        // query would never appear for a filter that matched nothing.
        isEmpty={() => rows.length === 0}
        empty={
          <Card>
            <EmptyState
              icon={<ClipboardCheck className="h-5 w-5" />}
              {...approvalsEmptyCopy({
                view: filters.filter.view,
                requesters: filters.filter.requesters.length,
                search: filters.filter.search.trim(),
              })}
            />
          </Card>
        }
      >
        {() => (
          <Card className="overflow-hidden">
            <ul aria-label="Approval requests">
              {rows.map((request) => (
                <RequestRow
                  key={request.id}
                  request={request}
                  canDecide={canDecide}
                  onDecide={setConfirm}
                />
              ))}
            </ul>
          </Card>
        )}
      </QueryBoundary>

      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(o) => !o && closeDialog()}
        title={
          confirm?.outcome === 'approved'
            ? `Quarantine ${confirm.identityName}?`
            : `Decline this request${confirm ? ` for ${confirm.identityName}` : ''}?`
        }
        description={
          confirm?.outcome === 'approved'
            ? 'The identity keeps existing but is blocked from acting until released, and you are recorded as the approver who produced that state. Synthetic — no upstream state changes.'
            : // The old copy already promised the analyst "can see that it was
              // answered" — true only via a full-text search of the audit log on
              // another screen, and silent about why. Now that a decline keeps
              // its reason and an Analyst can read their own decided rows here,
              // the promise is one this screen keeps.
              'The identity is left exactly as it is. Your reason, the refusal, and who made it are recorded on the request and written to the audit log, so the analyst who raised it can see what you decided and why.'
        }
        confirmLabel={confirm?.outcome === 'approved' ? 'Approve and quarantine' : 'Decline'}
        confirmVariant={confirm?.outcome === 'approved' ? 'danger' : 'primary'}
        // Trimmed, so whitespace is not a reason. This makes the API's
        // REASON_REQUIRED unreachable through the UI by design; that check stays
        // as the enforcing boundary rather than as this dialog's error path.
        confirmDisabled={confirm?.outcome === 'declined' && note.trim().length === 0}
        pending={decide.isPending}
        onConfirm={runDecision}
      >
        {confirm?.outcome === 'declined' && (
          <Textarea
            label="Why are you declining?"
            hint="Kept on the request and shown to the Analyst who raised it."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            showCount
          />
        )}
      </ConfirmDialog>
    </div>
  );
}
