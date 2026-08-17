import { useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Bot,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  MessageSquare,
  ShieldCheck,
  ShieldX,
  TriangleAlert,
  Wrench,
  CheckCheck,
} from 'lucide-react';
import { useMarkReviewed, useSession, useSessionIdentity } from './queries';
import {
  useQuarantineAgent,
  useRecommendQuarantine,
  useReleaseQuarantine,
} from '@/features/discover/queries';
import type { AgentSessionWithIdentity } from '@/mocks/api';
import { SPAWN_KIND_LABELS, type SessionStep } from '@/mocks/types';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card, CardBody, CardFooter, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { RiskPill } from '@/components/ui/RiskPill';
import { Timeline, type TimelineItem } from '@/components/ui/Timeline';
import { KeyValueList } from '@/components/ui/KeyValueList';
import { Banner } from '@/components/ui/Banner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { RoleRestricted } from '@/components/ui/RoleRestricted';
import { Tooltip } from '@/components/ui/Tooltip';
import { Skeleton, SkeletonText } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
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

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="eyebrow mb-1">{label}</div>
      <div className="text-[length:var(--fs-small)] text-text">{children}</div>
    </div>
  );
}

/**
 * The verdict, as one full-width strip above the trace.
 *
 * Everything an analyst needs before reading a single step — how bad, whether anyone
 * has looked, whether the agent is still acting — used to be scattered down a rail
 * beside the timeline, so the page opened with three columns of equal weight and no
 * entry point. One strip gives the screen a top line to read first.
 */
function SessionSummary({ session }: { session: AgentSessionWithIdentity }) {
  const quarantined = session.identityStatus === 'quarantined';
  return (
    <Card>
      <CardBody className="space-y-4 pt-5">
        <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
          <div className="min-w-0">
            <div className="eyebrow mb-1">Session risk</div>
            <RiskPill score={session.riskScore} />
          </div>
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
          <Stat label="Anomalies">
            <span className={'tnum ' + (session.anomalyCount > 0 ? 'font-medium text-crit-fg' : '')}>
              {session.anomalyCount}
            </span>
          </Stat>
          <Stat label="Steps">
            <span className="tnum">{session.steps.length}</span>
          </Stat>
          <Stat label="Duration">
            <span className="tnum">{duration(sessionMs(session))}</span>
          </Stat>
          <Stat label="Started">{relativeTime(session.startedAt)}</Stat>

          {/* Beside the verdict, not below the rail. As the last card in a 780px stack
              these sat under the fold, so the two most consequential controls on the
              screen were the only things you had to go looking for. */}
          <div className="ml-auto">
            <Actions session={session} />
          </div>
        </div>

        {session.quarantineRecommendedAt && !quarantined && (
          <Banner tone="warning">
            An analyst has recommended quarantining this agent. Awaiting an admin decision.
          </Banner>
        )}
      </CardBody>
    </Card>
  );
}

/** The right-hand pane of the trace card: the step you selected, and how to move. */
function StepDetail({
  step,
  index,
  total,
  startedAt,
  onStep,
}: {
  step: SessionStep;
  index: number;
  total: number;
  startedAt: string;
  onStep: (delta: 1 | -1) => void;
}) {
  const Icon = STEP_ICON[step.kind];
  return (
    <div className="flex min-w-0 flex-col">
      <CardHeader
        title={
          <span className="inline-flex items-center gap-2">
            <Icon className="h-4 w-4 text-text-tertiary" aria-hidden="true" />
            {STEP_LABEL[step.kind]}
          </span>
        }
        description={`${dateTime(step.at)} · ${elapsed(step, startedAt)} into the session`}
        action={
          <span className="flex items-center gap-2">
            {step.scope && (
              <Badge tone={step.scope === 'admin' ? 'critical' : step.scope === 'write' ? 'warning' : 'neutral'}>
                {step.scope}
              </Badge>
            )}
            {step.anomaly && (
              <Badge tone="critical" icon={<TriangleAlert className="h-3 w-3" />}>Anomaly</Badge>
            )}
          </span>
        }
      />
      <CardBody className="flex-1 space-y-4">
        {step.anomaly && (
          <Banner tone="critical">
            This step deviates from the agent's established behavior and was flagged for review.
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
      {/* "Step through the session timeline" is the FRS verb for this screen, and it had
          no control — only clicking rows in the index beside it. */}
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
          Step {index + 1} of {total}
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

/**
 * How many steps were flagged, and a way to reach them.
 *
 * This was two bare chevrons flanking the word "anomaly" in the card header — nothing
 * said they jumped between flagged steps, and with a single anomaly a *previous* and a
 * *next* both cycled to the same step. Now it states the count, and the affordance
 * matches the set: one anomaly gets one destination, several get a position and arrows.
 */
function AnomalyJump({
  anomalyIds,
  selectedId,
  onJump,
}: {
  anomalyIds: string[];
  selectedId: string;
  onJump: (dir: 1 | -1) => void;
}) {
  if (anomalyIds.length === 0) return null;
  const position = anomalyIds.indexOf(selectedId) + 1;
  const single = anomalyIds.length === 1;

  return (
    <div className="flex items-center justify-between gap-2 border-y border-border bg-surface-2 px-5 py-2">
      <span className="inline-flex items-center gap-1.5 text-[length:var(--fs-micro)] font-medium text-crit-fg">
        <TriangleAlert className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        {pluralize(anomalyIds.length, 'anomaly', 'anomalies')}
      </span>

      {single ? (
        <button
          type="button"
          onClick={() => onJump(1)}
          disabled={position === 1}
          className="rounded px-1.5 py-0.5 text-[length:var(--fs-micro)] font-medium text-accent-text hover:bg-surface-hover disabled:cursor-default disabled:text-text-tertiary disabled:hover:bg-transparent"
        >
          {position === 1 ? 'Showing it' : 'Go to step'}
        </button>
      ) : (
        <span className="flex items-center gap-1">
          <span className="tnum text-[length:var(--fs-micro)] text-text-tertiary">
            {position > 0 ? `${position} of ${anomalyIds.length}` : 'Jump to'}
          </span>
          {/* 24px minimum target (WCAG 2.2 SC 2.5.8) — these were 22px. */}
          <Tooltip content="Previous anomalous step">
            <button
              type="button"
              aria-label="Previous anomalous step"
              onClick={() => onJump(-1)}
              className="flex h-6 w-6 items-center justify-center rounded text-text-tertiary hover:bg-surface-hover hover:text-text"
            >
              <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </Tooltip>
          <Tooltip content="Next anomalous step">
            <button
              type="button"
              aria-label="Next anomalous step"
              onClick={() => onJump(1)}
              className="flex h-6 w-6 items-center justify-center rounded text-text-tertiary hover:bg-surface-hover hover:text-text"
            >
              <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </Tooltip>
        </span>
      )}
    </div>
  );
}

/** Why the score is what it is. The number itself lives in the summary strip. */
function RiskBreakdown({ session }: { session: AgentSessionWithIdentity }) {
  return (
    <Card>
      <CardHeader title="Why this score" description="Scored from this session's own evidence." />
      <CardBody>
        <dl className="space-y-2.5">
          {session.riskFactors.map((factor) => (
            <div key={factor.label} className="grid grid-cols-[1fr_auto] items-baseline gap-2">
              <dt className="text-[length:var(--fs-small)] text-text-secondary">{factor.label}</dt>
              <dd className="tnum text-[length:var(--fs-small)] font-medium text-text">
                +{Math.round(factor.points)}
              </dd>
              <p className="col-span-2 text-[length:var(--fs-micro)] text-text-tertiary">{factor.detail}</p>
            </div>
          ))}
        </dl>
      </CardBody>
    </Card>
  );
}

function Provenance({ session }: { session: AgentSessionWithIdentity }) {
  const identityQuery = useSessionIdentity(session.identityId);
  const spawn = session.provenance.spawnedBy;
  return (
    <Card>
      <CardHeader title="Provenance" description="What started this session, and what it ran as." />
      <CardBody>
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
              // Was its own card for a single link — a whole boundary around one line.
              label: 'Identity',
              value: identityQuery.data ? (
                <Link
                  to={`/discover/${identityQuery.data.id}`}
                  className="text-accent-text hover:underline"
                >
                  {identityQuery.data.name}
                </Link>
              ) : (
                <SkeletonText lines={1} />
              ),
              mono: true,
            },
          ]}
        />
      </CardBody>
    </Card>
  );
}

/**
 * Actions, gated per spec §5. Every role that can do *something* gets its own path:
 * an Analyst proposes, a Security Admin carries out, a Tenant Admin can undo.
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

  const showReview = canReview && session.reviewState === 'open';
  const showQuarantine = canQuarantine && !quarantined;
  const showRecommend = !canQuarantine && canRecommend && !quarantined;
  const showRelease = canRelease && quarantined;
  const anyAction = showReview || showQuarantine || showRecommend || showRelease;

  /** Same close-and-report handling for every action, so none can drift. */
  const settle = (message: string, tone: 'success' | 'critical') => ({
    onSuccess: () => {
      setConfirm(null);
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
      <ConfirmDialog
        open={confirm === 'quarantine'}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={`Quarantine ${session.identityName}?`}
        description="The agent keeps existing but is blocked from acting until released. This applies to the agent, so it affects every session it runs. Synthetic — no upstream state changes."
        confirmLabel="Quarantine"
        confirmVariant="danger"
        pending={quarantine.isPending}
        onConfirm={() =>
          quarantine.mutate(session.identityId, settle(`${session.identityName} quarantined`, 'critical'))
        }
      />
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

function Replay({ session }: { session: AgentSessionWithIdentity }) {
  const [selectedId, setSelectedId] = useState(session.steps[0]?.id ?? '');
  const selectedIndex = Math.max(0, session.steps.findIndex((s) => s.id === selectedId));
  const selected = session.steps[selectedIndex];
  const anomalyIds = useMemo(() => session.steps.filter((s) => s.anomaly).map((s) => s.id), [session.steps]);

  const stepBy = (delta: 1 | -1) => {
    const next = session.steps[selectedIndex + delta];
    if (next) setSelectedId(next.id);
  };

  const jumpAnomaly = (dir: 1 | -1) => {
    if (anomalyIds.length === 0) return;
    const curIndex = anomalyIds.indexOf(selectedId);
    const next =
      curIndex === -1
        ? dir === 1
          ? anomalyIds[0]
          : anomalyIds[anomalyIds.length - 1]
        : anomalyIds[(curIndex + dir + anomalyIds.length) % anomalyIds.length];
    setSelectedId(next);
    const position = anomalyIds.indexOf(next) + 1;
    const step = session.steps.find((s) => s.id === next);
    // Say which anomaly, not just that one was picked — "selected" alone told a
    // screen-reader user nothing about where they had landed.
    announce(
      `Anomaly ${position} of ${anomalyIds.length}. ${step ? STEP_LABEL[step.kind] : 'Step'}: ${step?.summary ?? ''}. Step ${session.steps.findIndex((s) => s.id === next) + 1} of ${session.steps.length}.`,
    );
  };

  const items: TimelineItem[] = session.steps.map((step) => {
    const Icon = STEP_ICON[step.kind];
    return {
      id: step.id,
      icon: <Icon className="h-3.5 w-3.5" aria-hidden="true" />,
      // The summary is what the step DID — `assume_role(target)`, `delete_object(...)`.
      // The row used to show only the kind, so five identical "Tool call" rows meant
      // reading a session took one click per step.
      title: step.summary,
      subtitle: (
        <>
          {STEP_LABEL[step.kind]}
          {step.scope && <span className="text-text-secondary"> · {step.scope}</span>}
        </>
      ),
      flag: step.anomaly ? (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-[var(--r-xs)] bg-crit-bg px-1 font-medium text-crit-fg">
          <TriangleAlert className="h-3 w-3" aria-hidden="true" />
          Anomaly
        </span>
      ) : undefined,
      meta: elapsed(step, session.startedAt),
      tone: step.anomaly ? 'anomaly' : step.id === selectedId ? 'active' : 'default',
      selected: step.id === selectedId,
      onSelect: () => setSelectedId(step.id),
    };
  });

  return (
    // Source order is the mobile order: verdict, then the trace, then why and actions.
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_var(--rail-w)] xl:items-start">
      <div className="xl:col-span-2">
        <SessionSummary session={session} />
      </div>

      {/* Index and content in one card, sharing one height. As two cards the index ran
          676px beside a 186px detail pane with 490px of dead space under it — the
          smallest thing on the page was the one you were meant to be reading. */}
      <Card className="overflow-hidden">
        <div className="grid md:grid-cols-[18rem_minmax(0,1fr)]">
          <div className="flex min-w-0 flex-col border-b border-border md:border-b-0 md:border-r">
            <CardHeader title="Timeline" />
            <AnomalyJump anomalyIds={anomalyIds} selectedId={selectedId} onJump={jumpAnomaly} />
            {/* Capped so the card has a definite height for the detail pane to match,
                and short on mobile so that pane stays reachable without a long scroll.
                Stable gutter: a 6-step session needs no scrollbar and a 12-step one
                does, so without it the elapsed-time column jumped 10px between
                sessions and whenever a filter changed the list. */}
            <div className="max-h-[16rem] overflow-y-auto px-5 pb-5 pt-3 [scrollbar-gutter:stable] md:max-h-[34rem]">
              <Timeline items={items} ariaLabel="Session steps" />
            </div>
          </div>

          {selected && (
            <StepDetail
              step={selected}
              index={selectedIndex}
              total={session.steps.length}
              startedAt={session.startedAt}
              onStep={stepBy}
            />
          )}
        </div>
      </Card>

      <aside className="space-y-4">
        <RiskBreakdown session={session} />
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
        // The time range only; step count, anomalies and duration read better as
        // labelled figures in the summary strip than as a run-on of dot-separated text.
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
