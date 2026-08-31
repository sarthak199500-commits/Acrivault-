import { useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Bot,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  GitBranch,
  Ban,
  Loader,
  MessageSquare,
  ShieldCheck,
  ShieldX,
  Sparkles,
  TriangleAlert,
  Wrench,
  CheckCheck,
} from 'lucide-react';
import { useDecideBlockedStep, useMarkReviewed, useSession, useSessionIdentity } from './queries';
import {
  useQuarantineAgent,
  useRecommendQuarantine,
  useReleaseQuarantine,
} from '@/features/discover/queries';
import type { AgentSessionWithIdentity } from '@/mocks/api';
import { SPAWN_KIND_LABELS, isFlaggedStep, type SessionStep, type StepStatus } from '@/mocks/types';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card, CardBody, CardFooter, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button, buttonClasses } from '@/components/ui/Button';
import { Timeline, type TimelineItem } from '@/components/ui/Timeline';
import { KeyValueList } from '@/components/ui/KeyValueList';
import { Banner } from '@/components/ui/Banner';
import { Dialog } from '@/components/ui/Dialog';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Textarea } from '@/components/ui/Textarea';
import { RoleRestricted } from '@/components/ui/RoleRestricted';
import { Skeleton, SkeletonText } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Tooltip } from '@/components/ui/Tooltip';
import { useCan } from '@/components/ui/Can';
import { dateTime, duration, pluralize, relativeTime } from '@/lib/format';
import { toast } from '@/stores/toast';
import { errorInfo } from '@/lib/apiError';
import { announce } from '@/lib/a11y';

const STEP_ICON: Record<SessionStep['kind'], typeof Bot> = {
  prompt: MessageSquare,
  'tool-call': Wrench,
  'model-response': Bot,
};
const STEP_LABEL: Record<SessionStep['kind'], string> = {
  prompt: 'Prompt',
  'tool-call': 'Tool call',
  'model-response': 'Model response',
};

const sessionMs = (session: AgentSessionWithIdentity) =>
  new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime();

/** Elapsed from the session start, so a burst of calls is visible in the list. */
function elapsed(step: SessionStep, startedAt: string): string {
  const ms = new Date(step.at).getTime() - new Date(startedAt).getTime();
  return ms < 1000 ? '0s' : `+${duration(ms)}`;
}

/** One place decides how a step's verdict reads, so timeline and detail cannot drift. */
function stepVerdict(step: SessionStep): { label: string; tone: 'critical' | 'warning'; icon: ReactNode } | null {
  if (step.status === 'blocked') {
    return step.holdEnforced === false
      ? { label: 'Observed, not blocked', tone: 'warning', icon: <Ban className="h-3 w-3" aria-hidden="true" /> }
      : { label: 'Held', tone: 'critical', icon: <Ban className="h-3 w-3" aria-hidden="true" /> };
  }
  if (step.status === 'anomaly') {
    return { label: 'Anomaly', tone: 'critical', icon: <TriangleAlert className="h-3 w-3" aria-hidden="true" /> };
  }
  if (step.status === 'scoring') {
    return { label: 'Scoring', tone: 'warning', icon: <Loader className="h-3 w-3" aria-hidden="true" /> };
  }
  return null;
}

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="eyebrow mb-1">{label}</div>
      <div className="text-[length:var(--fs-small)] text-text">{children}</div>
    </div>
  );
}

/**
 * The verdict strip, full width above the trace.
 *
 * A session carries no score — spec 10.2 asks for `Flagged (Yes/No)` and 11.3 puts
 * RISK_SCORE on the identity. What used to sit here was a derived 0..100 computed in the
 * UI; ranking on the raw counts turned out to triage identically, so the number was pure
 * audit liability. Actions live here too: as the last card in the rail they sat under
 * the fold, and they are the point of the screen.
 */
function SessionSummary({ session }: { session: AgentSessionWithIdentity }) {
  const quarantined = session.identityStatus === 'quarantined';
  const scoringPending = session.steps.some((s) => s.status === 'scoring');
  return (
    <Card>
      <CardBody className="space-y-4 pt-5">
        <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
          <Stat label="Flagged">
            {session.flagged ? (
              <Badge tone="critical" icon={<TriangleAlert className="h-3 w-3" />}>Yes</Badge>
            ) : (
              <Badge tone="neutral">No</Badge>
            )}
          </Stat>
          <Stat label="Anomalies">
            <span className={'tnum ' + (session.anomalyCount > 0 ? 'font-medium text-crit-fg' : '')}>
              {session.anomalyCount}
            </span>
          </Stat>
          <Stat label="Held steps">
            <span className={'tnum ' + (session.blockedCount > 0 ? 'font-medium text-crit-fg' : '')}>
              {session.blockedCount}
            </span>
          </Stat>
          <Stat label="Review">
            <Badge tone={session.reviewState === 'reviewed' ? 'info' : 'warning'} className="capitalize">
              {session.reviewState}
            </Badge>
          </Stat>
          <Stat label="Agent">
            {quarantined ? (
              <Badge tone="critical" icon={<ShieldX className="h-3 w-3" />}>Quarantined</Badge>
            ) : (
              <Badge tone="neutral">Acting</Badge>
            )}
          </Stat>
          <Stat label="Steps">
            <span className="tnum">{session.steps.length}</span>
          </Stat>
          <Stat label="Duration">
            <span className="tnum">{duration(sessionMs(session))}</span>
          </Stat>
          <Stat label="Started">{relativeTime(session.startedAt)}</Stat>

          <div className="ml-auto">
            <Actions session={session} />
          </div>
        </div>

        {scoringPending && (
          <Banner tone="warning">
            Some steps have not been scored yet. Treat this session as incomplete rather than clean.
          </Banner>
        )}
        {session.quarantineRecommendedAt && !quarantined && (
          <Banner tone="warning">
            An analyst has recommended quarantining this agent. Awaiting an admin decision.
          </Banner>
        )}
      </CardBody>
    </Card>
  );
}

/** FR-006: an analyst confirms a hold or overrides it with a written justification. */
function BlockDecision({ session, step }: { session: AgentSessionWithIdentity; step: SessionStep }) {
  const canAct = useCan('session.quarantine');
  const decide = useDecideBlockedStep(session.id);
  const [overriding, setOverriding] = useState(false);
  const [justification, setJustification] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (step.blockDecision) {
    return (
      <Banner tone={step.blockDecision.outcome === 'confirmed' ? 'info' : 'warning'}>
        {step.blockDecision.outcome === 'confirmed'
          ? `Block confirmed ${relativeTime(step.blockDecision.at)}.`
          : `Overridden ${relativeTime(step.blockDecision.at)} — “${step.blockDecision.justification}”`}
      </Banner>
    );
  }

  if (!canAct) return <RoleRestricted inline note="Your role can review this hold but not decide it." />;

  const submitOverride = () => {
    if (!justification.trim()) {
      setError('Enter a justification before overriding.');
      return;
    }
    decide.mutate(
      { stepId: step.id, outcome: 'overridden', justification },
      {
        onSuccess: () => {
          setOverriding(false);
          setJustification('');
          toast('Hold overridden', { tone: 'critical', description: 'Recorded in the audit trail.' });
        },
        onError: (err) => setError(errorInfo(err).message),
      },
    );
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        size="sm"
        variant="danger"
        loading={decide.isPending && !overriding}
        onClick={() =>
          decide.mutate(
            { stepId: step.id, outcome: 'confirmed' },
            { onSuccess: () => toast('Block confirmed', { tone: 'success' }) },
          )
        }
      >
        Confirm block
      </Button>
      <Button size="sm" variant="secondary" onClick={() => setOverriding(true)}>
        Override…
      </Button>

      <Dialog
        open={overriding}
        onOpenChange={(o) => {
          setOverriding(o);
          if (!o) setError(null);
        }}
        size="sm"
        title="Override this hold?"
        description="The action this rule stopped will be allowed to proceed. A written justification is required and is recorded in the audit trail."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOverriding(false)} disabled={decide.isPending}>
              Cancel
            </Button>
            <Button variant="danger" loading={decide.isPending} onClick={submitOverride}>
              Override
            </Button>
          </>
        }
      >
        <Textarea
          label="Justification"
          value={justification}
          onChange={(e) => {
            setJustification(e.target.value);
            if (error) setError(null);
          }}
          placeholder="Why this action should be allowed to proceed"
          error={error ?? undefined}
          rows={3}
        />
      </Dialog>
    </div>
  );
}

function StepDetail({
  session,
  step,
  index,
  onStep,
}: {
  session: AgentSessionWithIdentity;
  step: SessionStep;
  index: number;
  onStep: (delta: 1 | -1) => void;
}) {
  const Icon = STEP_ICON[step.kind];
  const verdict = stepVerdict(step);
  const total = session.steps.length;
  return (
    <div className="flex min-w-0 flex-col">
      <CardHeader
        title={
          <span className="inline-flex items-center gap-2">
            <Icon className="h-4 w-4 text-text-tertiary" aria-hidden="true" />
            {STEP_LABEL[step.kind]}
          </span>
        }
        description={`${dateTime(step.at)} · ${elapsed(step, session.startedAt)} into the session`}
        action={
          <span className="flex items-center gap-2">
            {step.scope && (
              <Badge tone={step.scope === 'admin' ? 'critical' : step.scope === 'write' ? 'warning' : 'neutral'}>
                {step.scope}
              </Badge>
            )}
            {verdict && <Badge tone={verdict.tone} icon={verdict.icon}>{verdict.label}</Badge>}
          </span>
        }
      />
      <CardBody className="flex-1 space-y-4">
        {step.status === 'blocked' && (
          <>
            <Banner tone={step.holdEnforced === false ? 'warning' : 'critical'}>
              {step.holdEnforced === false
                ? `Matched ${step.blockedByRule ?? 'a hard-deny rule'}, but the source has no hold primitive — the action completed and was only observed.`
                : `Held by ${step.blockedByRule ?? 'a hard-deny rule'}. The action did not complete.`}
            </Banner>
            <BlockDecision session={session} step={step} />
          </>
        )}
        {step.status === 'anomaly' && (
          // FR-005 wants the reason inline, not just a mark.
          <Banner tone="critical">{step.anomalyReason ?? 'Outside baseline for this identity.'}</Banner>
        )}
        {step.status === 'scoring' && (
          <Banner tone="warning">
            The engine has not scored this step yet. It is not confirmed clean.
          </Banner>
        )}
        <div>
          <div className="eyebrow mb-1.5">What ran</div>
          <p className="break-words font-mono text-[length:var(--fs-body)] text-text">{step.summary}</p>
        </div>
        <div>
          <div className="eyebrow mb-1.5">Detail</div>
          <p className="text-[length:var(--fs-small)] text-text-secondary">{step.detail}</p>
        </div>
      </CardBody>
      <CardFooter className="mt-auto justify-between">
        <Button
          variant="ghost"
          size="sm"
          leadingIcon={<ChevronLeft className="h-4 w-4" />}
          disabled={index === 0}
          onClick={() => onStep(-1)}
        >
          Previous
        </Button>
        <span className="tnum text-[length:var(--fs-small)] text-text-tertiary">
          Step {step.stepNo} of {total}
        </span>
        <Button
          variant="ghost"
          size="sm"
          trailingIcon={<ChevronRight className="h-4 w-4" />}
          disabled={index === total - 1}
          onClick={() => onStep(1)}
        >
          Next
        </Button>
      </CardFooter>
    </div>
  );
}

function Provenance({ session }: { session: AgentSessionWithIdentity }) {
  const identityQuery = useSessionIdentity(session.identityId);
  const spawn = session.provenance.spawnedBy;
  return (
    <Card>
      <CardHeader title="Provenance" description="What started this session, and what it ran as." />
      <CardBody className="space-y-4">
        <KeyValueList
          items={[
            { label: 'Spawned by', value: `${SPAWN_KIND_LABELS[spawn.kind]} — ${spawn.label}`, mono: true },
            { label: 'Model', value: session.provenance.model, mono: true },
            { label: 'Region', value: session.provenance.region, mono: true },
            {
              label: session.provenance.credentials.length === 1 ? 'Credential' : 'Credentials',
              value: (
                <span className="flex flex-col items-end gap-0.5">
                  {session.provenance.credentials.map((c) => (
                    <span key={c}>{c}</span>
                  ))}
                </span>
              ),
              mono: true,
            },
            {
              label: 'Identity',
              value: identityQuery.data ? (
                <Link to={`/discover/${identityQuery.data.id}`} className="text-accent-text hover:underline">
                  {identityQuery.data.name}
                </Link>
              ) : (
                <SkeletonText lines={1} />
              ),
              mono: true,
            },
            { label: 'Owner', value: session.identityOwner ?? 'Unassigned', mono: !!session.identityOwner },
          ]}
        />

        <div className="flex flex-wrap gap-2 border-t border-border pt-3">
          {/* FR-007: behaviour context straight through to reach context, no lookup. */}
          <Link
            to={`/resilience/blast-radius?origin=${encodeURIComponent(session.identityId)}`}
            className={buttonClasses('secondary', 'sm')}
          >
            <GitBranch className="h-3.5 w-3.5" aria-hidden="true" />
            Check reach
          </Link>
          <Tooltip content="Defender Copilot is a Wave 2 concept — advisory suggestions, never autonomous.">
            <Link to="/resilience/copilot" className={buttonClasses('ghost', 'sm')}>
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Ask Copilot
              <span className="ml-1 rounded-[var(--r-xs)] border border-border px-1 text-[length:var(--fs-micro)] text-text-tertiary">
                Concept
              </span>
            </Link>
          </Tooltip>
        </div>
      </CardBody>
    </Card>
  );
}

/**
 * Actions, gated per spec §5. Every role that can do something gets its own path: an
 * Analyst proposes, a Security Admin carries out, a Tenant Admin can undo.
 *
 * OPEN — spec conflict: the Intelligence FRS (AR-01, RBAC matrix 15.3) puts quarantine
 * on the Security Analyst and makes the config admin view-only, which inverts this.
 * Left as-is pending a decision; changing it touches lib/permissions across the product.
 */
function Actions({ session }: { session: AgentSessionWithIdentity }) {
  const canReview = useCan('session.markReviewed');
  const canQuarantine = useCan('session.quarantine');
  const canRecommend = useCan('session.quarantineRecommend');
  const canRelease = useCan('session.quarantineRelease');
  const quarantined = session.identityStatus === 'quarantined';

  const markReviewed = useMarkReviewed();
  const quarantine = useQuarantineAgent();
  const recommend = useRecommendQuarantine();
  const release = useReleaseQuarantine();
  const [confirm, setConfirm] = useState<null | 'review' | 'quarantine' | 'recommend' | 'release'>(null);
  const [note, setNote] = useState('');

  const showReview = canReview && session.reviewState === 'open';
  const showQuarantine = canQuarantine && !quarantined;
  const showRecommend = !canQuarantine && canRecommend && !quarantined;
  const showRelease = canRelease && quarantined;
  const anyAction = showReview || showQuarantine || showRecommend || showRelease;

  const settle = (message: string, tone: 'success' | 'critical') => ({
    onSuccess: () => {
      setConfirm(null);
      setNote('');
      toast(message, { tone });
    },
    onError: (err: unknown) => toast(errorInfo(err).message, { tone: 'critical' }),
  });

  return (
    <>
      {anyAction ? (
        <div className="flex flex-wrap items-center gap-2">
          {showReview && (
            <Button variant="secondary" leadingIcon={<CheckCheck className="h-4 w-4" />} onClick={() => setConfirm('review')}>
              Mark reviewed
            </Button>
          )}
          {showQuarantine && (
            <Button variant="danger" leadingIcon={<ShieldX className="h-4 w-4" />} onClick={() => setConfirm('quarantine')}>
              Quarantine agent
            </Button>
          )}
          {showRecommend && (
            <Button variant="secondary" leadingIcon={<ShieldX className="h-4 w-4" />} onClick={() => setConfirm('recommend')}>
              Recommend quarantine
            </Button>
          )}
          {showRelease && (
            <Button variant="secondary" leadingIcon={<ShieldCheck className="h-4 w-4" />} onClick={() => setConfirm('release')}>
              Release from quarantine
            </Button>
          )}
        </div>
      ) : (
        <RoleRestricted inline note="Your role can review this session but not act on it." />
      )}

      <ConfirmDialog
        open={confirm === 'review'}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="Mark this session reviewed?"
        description="This records that an analyst has inspected the session, and is written to the audit trail."
        confirmLabel="Mark reviewed"
        pending={markReviewed.isPending}
        onConfirm={() => markReviewed.mutate(session.id, settle('Session marked reviewed', 'success'))}
      />

      {/* UC-04 takes an optional note at confirmation and notifies the agent's owner. */}
      <Dialog
        open={confirm === 'quarantine'}
        onOpenChange={(o) => !o && setConfirm(null)}
        size="sm"
        title={`Quarantine ${session.identityName}?`}
        description={`The agent keeps existing but is blocked from acting until released. This applies to the agent, so it affects every session it runs. ${session.identityOwner ? `${session.identityOwner} will be notified.` : 'This agent has no owner to notify.'} Synthetic — no upstream state changes.`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(null)} disabled={quarantine.isPending}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={quarantine.isPending}
              onClick={() =>
                quarantine.mutate(
                  { identityId: session.identityId, note },
                  settle(`${session.identityName} quarantined`, 'critical'),
                )
              }
            >
              Quarantine
            </Button>
          </>
        }
      >
        <Textarea
          label="Note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="What prompted this containment"
          rows={2}
        />
      </Dialog>

      <ConfirmDialog
        open={confirm === 'recommend'}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={`Recommend quarantining ${session.identityName}?`}
        description="Your role can propose this but not carry it out. An admin reviews the recommendation and decides. The proposal is written to the audit trail."
        confirmLabel="Send recommendation"
        pending={recommend.isPending}
        onConfirm={() =>
          recommend.mutate(
            { identityId: session.identityId, fromSessionId: session.id },
            settle(`Quarantine recommended for ${session.identityName}`, 'success'),
          )
        }
      />
      <ConfirmDialog
        open={confirm === 'release'}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={`Release ${session.identityName} from quarantine?`}
        description="The agent can act again immediately. Synthetic — no upstream state changes."
        confirmLabel="Release"
        pending={release.isPending}
        onConfirm={() =>
          release.mutate(session.identityId, settle(`${session.identityName} released`, 'success'))
        }
      />
    </>
  );
}

const TONE_FOR_STATUS: Record<StepStatus, 'default' | 'anomaly' | 'active'> = {
  normal: 'default',
  anomaly: 'anomaly',
  blocked: 'anomaly',
  scoring: 'default',
};

function Replay({ session }: { session: AgentSessionWithIdentity }) {
  const [selectedId, setSelectedId] = useState(session.steps[0]?.id ?? '');
  const selectedIndex = Math.max(0, session.steps.findIndex((s) => s.id === selectedId));
  const selected = session.steps[selectedIndex];
  const flaggedIds = useMemo(
    () => session.steps.filter(isFlaggedStep).map((s) => s.id),
    [session.steps],
  );

  const stepBy = (delta: 1 | -1) => {
    const next = session.steps[selectedIndex + delta];
    if (next) setSelectedId(next.id);
  };

  const jumpFlagged = (dir: 1 | -1) => {
    if (flaggedIds.length === 0) return;
    const curIndex = flaggedIds.indexOf(selectedId);
    const next =
      curIndex === -1
        ? dir === 1
          ? flaggedIds[0]
          : flaggedIds[flaggedIds.length - 1]
        : flaggedIds[(curIndex + dir + flaggedIds.length) % flaggedIds.length];
    setSelectedId(next);
    const step = session.steps.find((s) => s.id === next);
    announce(
      `Flagged step ${flaggedIds.indexOf(next) + 1} of ${flaggedIds.length}. ${
        step ? `${stepVerdict(step)?.label ?? ''} ${STEP_LABEL[step.kind]}: ${step.summary}. Step ${step.stepNo} of ${session.steps.length}.` : ''
      }`,
    );
  };

  const items: TimelineItem[] = session.steps.map((step) => {
    const Icon = STEP_ICON[step.kind];
    const verdict = stepVerdict(step);
    return {
      id: step.id,
      icon: <Icon className="h-3.5 w-3.5" aria-hidden="true" />,
      title: step.summary,
      subtitle: (
        <>
          {STEP_LABEL[step.kind]}
          {step.scope && <span className="text-text-secondary"> · {step.scope}</span>}
          {step.anomalyReason && <span className="text-crit-fg"> · {step.anomalyReason}</span>}
        </>
      ),
      flag: verdict ? (
        <span
          className={
            'inline-flex shrink-0 items-center gap-1 rounded-[var(--r-xs)] px-1 font-medium ' +
            (verdict.tone === 'critical' ? 'bg-crit-bg text-crit-fg' : 'bg-warn-bg text-warn-fg')
          }
        >
          {verdict.icon}
          {verdict.label}
        </span>
      ) : undefined,
      meta: elapsed(step, session.startedAt),
      tone: step.id === selectedId && step.status === 'normal' ? 'active' : TONE_FOR_STATUS[step.status],
      selected: step.id === selectedId,
      onSelect: () => setSelectedId(step.id),
    };
  });

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_var(--rail-w)] xl:items-start">
      <div className="xl:col-span-2">
        <SessionSummary session={session} />
      </div>

      <Card className="overflow-hidden">
        <div className="grid md:grid-cols-[18rem_minmax(0,1fr)]">
          <div className="flex min-w-0 flex-col border-b border-border md:border-b-0 md:border-r">
            <CardHeader title="Timeline" />
            {flaggedIds.length > 0 && (
              <div className="flex items-center justify-between gap-2 border-y border-border bg-surface-2 px-5 py-2">
                <span className="inline-flex items-center gap-1.5 text-[length:var(--fs-micro)] font-medium text-crit-fg">
                  <TriangleAlert className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {pluralize(flaggedIds.length, 'flagged step')}
                </span>
                {flaggedIds.length === 1 ? (
                  <button
                    type="button"
                    onClick={() => jumpFlagged(1)}
                    disabled={flaggedIds.indexOf(selectedId) === 0}
                    className="rounded px-1.5 py-0.5 text-[length:var(--fs-micro)] font-medium text-accent-text hover:bg-surface-hover disabled:cursor-default disabled:text-text-tertiary disabled:hover:bg-transparent"
                  >
                    {flaggedIds.indexOf(selectedId) === 0 ? 'Showing it' : 'Go to step'}
                  </button>
                ) : (
                  <span className="flex items-center gap-1">
                    <span className="tnum text-[length:var(--fs-micro)] text-text-tertiary">
                      {flaggedIds.indexOf(selectedId) >= 0
                        ? `${flaggedIds.indexOf(selectedId) + 1} of ${flaggedIds.length}`
                        : 'Jump to'}
                    </span>
                    <Tooltip content="Previous flagged step">
                      <button
                        type="button"
                        aria-label="Previous flagged step"
                        onClick={() => jumpFlagged(-1)}
                        className="flex h-6 w-6 items-center justify-center rounded text-text-tertiary hover:bg-surface-hover hover:text-text"
                      >
                        <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </Tooltip>
                    <Tooltip content="Next flagged step">
                      <button
                        type="button"
                        aria-label="Next flagged step"
                        onClick={() => jumpFlagged(1)}
                        className="flex h-6 w-6 items-center justify-center rounded text-text-tertiary hover:bg-surface-hover hover:text-text"
                      >
                        <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </Tooltip>
                  </span>
                )}
              </div>
            )}
            <div className="max-h-[16rem] overflow-y-auto px-5 pb-5 pt-3 [scrollbar-gutter:stable] md:max-h-[34rem]">
              <Timeline items={items} ariaLabel="Session steps" />
            </div>
          </div>

          {selected && (
            <StepDetail session={session} step={selected} index={selectedIndex} onStep={stepBy} />
          )}
        </div>
      </Card>

      <aside className="space-y-4">
        <Provenance session={session} />
      </aside>
    </div>
  );
}

export function SessionReplayScreen() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const query = useSession(sessionId);
  const session = query.data;

  return (
    <div>
      <ScreenHeader
        eyebrow="Know · Intelligence · Session Replay"
        title={session ? session.identityName : 'Session Replay'}
        description={session ? `${dateTime(session.startedAt)} – ${dateTime(session.endedAt)}` : undefined}
        actions={
          <Button variant="ghost" size="sm" leadingIcon={<ChevronLeft className="h-4 w-4" />} onClick={() => navigate('/intelligence')}>
            All sessions
          </Button>
        }
      />

      {query.isPending ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_var(--rail-w)]">
          <Skeleton className="h-24 xl:col-span-2" />
          <Skeleton className="h-[500px]" />
          <Skeleton className="h-[500px]" />
        </div>
      ) : query.isError ? (
        <ErrorState message="We couldn't load this session." onRetry={() => query.refetch()} />
      ) : !session ? (
        <EmptyState headline="Session not found" guidance="This session id doesn't match a captured session." />
      ) : (
        <Replay session={session} />
      )}
    </div>
  );
}
