import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Bot,
  ChevronLeft,
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
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { RiskPill } from '@/components/ui/RiskPill';
import { Timeline, type TimelineItem } from '@/components/ui/Timeline';
import { KeyValueList } from '@/components/ui/KeyValueList';
import { Banner } from '@/components/ui/Banner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { RoleRestricted } from '@/components/ui/RoleRestricted';
import { Skeleton, SkeletonText } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { useCan } from '@/components/ui/Can';
import { dateTime, duration, pluralize } from '@/lib/format';
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

/** Elapsed time from the session start, so a burst of calls is visible in the list. */
function elapsed(step: SessionStep, startedAt: string): string {
  const ms = new Date(step.at).getTime() - new Date(startedAt).getTime();
  return ms < 1000 ? '0s' : `+${duration(ms)}`;
}

function StepDetail({ step, index, total }: { step: SessionStep; index: number; total: number }) {
  const Icon = STEP_ICON[step.kind];
  return (
    <Card>
      <CardHeader
        title={
          <span className="inline-flex items-center gap-2">
            <Icon className="h-4 w-4 text-text-tertiary" aria-hidden="true" />
            {STEP_LABEL[step.kind]}
            <span className="tnum text-[length:var(--fs-small)] font-normal text-text-tertiary">
              step {index + 1} of {total}
            </span>
          </span>
        }
        description={dateTime(step.at)}
        action={step.anomaly ? <Badge tone="critical" icon={<TriangleAlert className="h-3 w-3" />}>Anomaly</Badge> : undefined}
      />
      <CardBody className="space-y-3">
        {step.anomaly && (
          <Banner tone="critical">This step deviates from the agent's established behavior and was flagged for review.</Banner>
        )}
        <div>
          <div className="eyebrow mb-1">Summary</div>
          <p className="font-mono text-[length:var(--fs-small)] text-text">{step.summary}</p>
        </div>
        {step.scope && (
          <div>
            <div className="eyebrow mb-1">Scope</div>
            <Badge tone={step.scope === 'admin' ? 'critical' : step.scope === 'write' ? 'warning' : 'neutral'}>
              {step.scope}
            </Badge>
          </div>
        )}
        <div>
          <div className="eyebrow mb-1">Detail</div>
          <p className="text-[length:var(--fs-small)] text-text-secondary">{step.detail}</p>
        </div>
      </CardBody>
    </Card>
  );
}

/**
 * The verdict: what this session scored and why. The breakdown is the point — an
 * unexplained number on a security screen is a number an analyst cannot act on or
 * defend, and session risk is now derived rather than inherited from the agent.
 */
function Verdict({ session }: { session: AgentSessionWithIdentity }) {
  const quarantined = session.identityStatus === 'quarantined';
  return (
    <Card>
      <CardHeader title="Session risk" description="Scored from this session's own evidence." />
      <CardBody className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <RiskPill score={session.riskScore} />
          <div className="flex flex-col items-end gap-1">
            <Badge tone={session.reviewState === 'reviewed' ? 'info' : 'warning'} className="capitalize">
              {session.reviewState}
            </Badge>
            {quarantined && (
              <Badge tone="critical" icon={<ShieldX className="h-3 w-3" />}>Agent quarantined</Badge>
            )}
          </div>
        </div>

        <dl className="space-y-1.5 border-t border-border pt-3">
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
    <>
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
            ]}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Identity" />
        <CardBody>
          {identityQuery.data ? (
            <Link
              to={`/discover/${identityQuery.data.id}`}
              className="font-mono text-[length:var(--fs-small)] text-accent-text hover:underline"
            >
              {identityQuery.data.name}
            </Link>
          ) : (
            <SkeletonText lines={1} />
          )}
        </CardBody>
      </Card>
    </>
  );
}

/**
 * Actions, gated per spec §5. Every role that can do *something* gets its own path:
 * an Analyst proposes, a Security Admin carries out, a Tenant Admin can undo. The
 * screen previously offered only the admin's quarantine, so an Analyst — the primary
 * reader here — was told their role could not act at all.
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
    <div className="space-y-2">
      {session.quarantineRecommendedAt && !quarantined && (
        <Banner tone="warning">
          An analyst has recommended quarantining this agent. Awaiting an admin decision.
        </Banner>
      )}

      {anyAction ? (
        <div className="flex flex-col gap-2">
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
        <RoleRestricted note="Your role can review this session but not act on it." />
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
    </div>
  );
}

function Replay({ session }: { session: AgentSessionWithIdentity }) {
  const [selectedId, setSelectedId] = useState(session.steps[0]?.id ?? '');
  const selectedIndex = Math.max(0, session.steps.findIndex((s) => s.id === selectedId));
  const selected = session.steps[selectedIndex];
  const anomalyIds = useMemo(() => session.steps.filter((s) => s.anomaly).map((s) => s.id), [session.steps]);

  const select = (id: string) => setSelectedId(id);

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
      onSelect: () => select(step.id),
    };
  });

  return (
    // Source order is the mobile order: verdict, then the trace, then context and
    // actions. The rail's cards are placed into the right column at xl.
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_var(--rail-w)] xl:items-start">
      <div className="xl:col-start-2 xl:row-start-1">
        <Verdict session={session} />
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] md:items-start xl:col-start-1 xl:row-start-1 xl:row-span-3">
        <Card>
          <CardHeader
            title="Timeline"
            description={pluralize(session.steps.length, 'step')}
            action={
              anomalyIds.length > 0 ? (
                <span className="flex items-center gap-0.5">
                  {/* 24px minimum target (WCAG 2.2 SC 2.5.8) — these were 22px. */}
                  <button
                    type="button"
                    aria-label="Previous anomaly"
                    onClick={() => jumpAnomaly(-1)}
                    className="flex h-6 w-6 items-center justify-center rounded text-text-tertiary hover:bg-surface-hover hover:text-text"
                  >
                    <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                  <span className="tnum text-[length:var(--fs-micro)] text-text-tertiary">
                    {pluralize(anomalyIds.length, 'anomaly', 'anomalies')}
                  </span>
                  <button
                    type="button"
                    aria-label="Next anomaly"
                    onClick={() => jumpAnomaly(1)}
                    className="flex h-6 w-6 items-center justify-center rounded text-text-tertiary hover:bg-surface-hover hover:text-text"
                  >
                    <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </span>
              ) : undefined
            }
          />
          {/* Short on mobile so the step detail below stays reachable without a long
              scroll; full height once the two sit side by side. */}
          <CardBody className="max-h-[16rem] overflow-y-auto md:max-h-[600px]">
            <Timeline items={items} ariaLabel="Session steps" />
          </CardBody>
        </Card>
        {selected && <StepDetail step={selected} index={selectedIndex} total={session.steps.length} />}
      </div>

      <aside className="space-y-4 xl:col-start-2 xl:row-start-2">
        <Provenance session={session} />
      </aside>

      <div className="xl:col-start-2 xl:row-start-3">
        <Actions session={session} />
      </div>
    </div>
  );
}

export function SessionReplayScreen() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const query = useSession(sessionId);
  const session = query.data;

  // FRS 3.5 asks the header for identity, model, time range, step count and an anomaly
  // flag. Model, end time and the anomaly count used to live only in the rail or nowhere.
  const description = session
    ? [
        `${dateTime(session.startedAt)} – ${dateTime(session.endedAt)}`,
        duration(new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()),
        pluralize(session.steps.length, 'step'),
        session.provenance.model,
      ].join(' · ')
    : undefined;

  return (
    <div>
      <ScreenHeader
        eyebrow="Know · Intelligence · Session Replay"
        title={session ? session.identityName : 'Session Replay'}
        description={description}
        actions={
          <div className="flex items-center gap-2">
            {session && session.anomalyCount > 0 && (
              <Badge tone="critical" icon={<TriangleAlert className="h-3 w-3" />}>
                {pluralize(session.anomalyCount, 'anomaly', 'anomalies')}
              </Badge>
            )}
            <Button variant="ghost" size="sm" leadingIcon={<ChevronLeft className="h-4 w-4" />} onClick={() => navigate('/intelligence')}>
              All sessions
            </Button>
          </div>
        }
      />

      {query.isPending ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_var(--rail-w)]">
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
