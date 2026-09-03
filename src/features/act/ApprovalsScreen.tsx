import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardCheck, ShieldX, Sparkles, UserRound } from 'lucide-react';
import { useApprovals, useDecideApproval } from './queries';
import type { ApprovalWithContext } from '@/mocks/api';
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
import { useCan } from '@/components/ui/Can';
import { count, dateTime, relativeTime } from '@/lib/format';
import { toast } from '@/stores/toast';
import { errorInfo } from '@/lib/apiError';

/** Which decision a confirmation dialog is holding, and about what. */
type Decision = { id: string; identityName: string; outcome: 'approved' | 'declined' };

function RequestRow({
  request,
  canDecide,
  onDecide,
}: {
  request: ApprovalWithContext;
  canDecide: boolean;
  onDecide: (decision: Decision) => void;
}) {
  return (
    <li className="border-b border-border px-5 py-4 last:border-b-0">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to={`/discover/${request.identityId}`}
              className="font-mono text-[length:var(--fs-body)] text-text hover:underline"
            >
              {request.identityName}
            </Link>
            <Badge tone="neutral">{NHI_TYPE_LABELS[request.identityType]}</Badge>
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
        </div>

        {canDecide && (
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
  const query = useApprovals('pending');
  const decide = useDecideApproval();
  const canDecide = useCan('session.quarantine');
  const canPropose = useCan('session.quarantineRecommend');
  const [confirm, setConfirm] = useState<Decision | null>(null);

  const runDecision = () => {
    if (!confirm) return;
    decide.mutate(
      { id: confirm.id, decision: confirm.outcome },
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
                  : 'The identity was left as it was.',
            },
          );
          setConfirm(null);
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
          query.data && query.data.length > 0 ? (
            <Badge tone="warning" className="tnum">
              {count(query.data.length)} pending
            </Badge>
          ) : undefined
        }
        description="Quarantines an Analyst has proposed and an admin has yet to decide. Approving contains the identity and records you as the approver; declining leaves it exactly as it is. Either way the decision is written to the audit log."
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

      <QueryBoundary
        query={query}
        loadingFallback={
          <Card className="px-5 py-4">
            <SkeletonText lines={6} />
          </Card>
        }
        isEmpty={(d) => d.length === 0}
        empty={
          <Card>
            {/* Says outright what this queue does and does not cover. The audit
                finding claimed "every state-changing action requires approval by
                design"; the FRS does not, and an empty table that implied it
                would misrepresent the product. Quarantine is the one action the
                permission model splits — everything else executes directly for
                a role that holds the capability. */}
            <EmptyState
              icon={<ClipboardCheck className="h-5 w-5" />}
              headline="Nothing is waiting for a decision"
              guidance="Quarantine is the one action Wave 1 splits between proposing and carrying out: an Analyst recommends it and an admin decides. Every other action — rotation, policy activation, release from quarantine, alert resolution — executes directly for a role that holds the capability, and is recorded in the audit log rather than queued here."
            />
          </Card>
        }
      >
        {(rows) => (
          <Card className="overflow-hidden">
            <ul aria-label="Pending approval requests">
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
        onOpenChange={(o) => !o && setConfirm(null)}
        title={
          confirm?.outcome === 'approved'
            ? `Quarantine ${confirm.identityName}?`
            : `Decline this request${confirm ? ` for ${confirm.identityName}` : ''}?`
        }
        description={
          confirm?.outcome === 'approved'
            ? 'The identity keeps existing but is blocked from acting until released, and you are recorded as the approver who produced that state. Synthetic — no upstream state changes.'
            : 'The identity is left exactly as it is. The refusal and who made it are written to the audit log, so the analyst who raised it can see that it was answered.'
        }
        confirmLabel={confirm?.outcome === 'approved' ? 'Approve and quarantine' : 'Decline'}
        confirmVariant={confirm?.outcome === 'approved' ? 'danger' : 'primary'}
        pending={decide.isPending}
        onConfirm={runDecision}
      />
    </div>
  );
}
