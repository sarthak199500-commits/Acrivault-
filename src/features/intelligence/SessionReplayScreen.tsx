import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Bot,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  MessageSquare,
  ShieldX,
  TriangleAlert,
  Wrench,
  CheckCheck,
} from 'lucide-react';
import { useSession, useSessionActions, useSessionIdentity } from './queries';
import type { AgentSession, SessionStep } from '@/mocks/types';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { RiskPill } from '@/components/ui/RiskPill';
import { Timeline, type TimelineItem } from '@/components/ui/Timeline';
import { KeyValueList } from '@/components/ui/KeyValueList';
import { Banner } from '@/components/ui/Banner';
import { Dialog } from '@/components/ui/Dialog';
import { RoleRestricted } from '@/components/ui/RoleRestricted';
import { Skeleton, SkeletonText } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { useCan } from '@/components/ui/Can';
import { dateTime, pluralize } from '@/lib/format';
import { toast } from '@/stores/toast';
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

function StepDetail({ step }: { step: SessionStep }) {
  const Icon = STEP_ICON[step.kind];
  return (
    <Card>
      <CardHeader
        title={
          <span className="inline-flex items-center gap-2">
            <Icon className="h-4 w-4 text-text-tertiary" aria-hidden="true" />
            {STEP_LABEL[step.kind]}
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
        <div>
          <div className="eyebrow mb-1">Detail</div>
          <p className="text-[length:var(--fs-small)] text-text-secondary">{step.detail}</p>
        </div>
      </CardBody>
    </Card>
  );
}

function SideRail({ session }: { session: AgentSession }) {
  const identityQuery = useSessionIdentity(session.identityId);
  const actions = useSessionActions(session.id);
  const canReview = useCan('session.markReviewed');
  const canQuarantine = useCan('session.quarantine');
  const [confirm, setConfirm] = useState<null | 'review' | 'quarantine'>(null);

  return (
    <aside className="space-y-4">
      <Card>
        <CardHeader title="Session" />
        <CardBody className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[length:var(--fs-small)] text-text-secondary">Session risk</span>
            <RiskPill score={session.riskScore} size="sm" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[length:var(--fs-small)] text-text-secondary">Status</span>
            <Badge tone={session.status === 'quarantined' ? 'critical' : session.status === 'reviewed' ? 'info' : 'warning'} className="capitalize">
              {session.status}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[length:var(--fs-small)] text-text-secondary">Anomalies</span>
            <span className="tnum text-[length:var(--fs-small)] text-text">{session.anomalyCount}</span>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Provenance" description="Where this agent ran from." />
        <CardBody>
          <KeyValueList
            items={[
              { label: 'Model', value: session.provenance.model, mono: true },
              { label: 'Origin', value: session.provenance.origin, mono: true },
              { label: 'Credential', value: session.provenance.credentialRef, mono: true },
            ]}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Identity" />
        <CardBody>
          {identityQuery.data ? (
            <Link to={`/discover/${identityQuery.data.id}`} className="font-mono text-[length:var(--fs-small)] text-accent-text hover:underline">
              {identityQuery.data.name}
            </Link>
          ) : (
            <SkeletonText lines={1} />
          )}
        </CardBody>
      </Card>

      {canReview || canQuarantine ? (
        <div className="flex flex-col gap-2">
          {canReview && session.status === 'open' && (
            <Button variant="secondary" leadingIcon={<CheckCheck className="h-4 w-4" />} onClick={() => setConfirm('review')}>
              Mark reviewed
            </Button>
          )}
          {canQuarantine && session.status !== 'quarantined' && (
            <Button variant="danger" leadingIcon={<ShieldX className="h-4 w-4" />} onClick={() => setConfirm('quarantine')}>
              Quarantine session
            </Button>
          )}
        </div>
      ) : (
        <RoleRestricted note="Your role can review this session but not act on it." />
      )}

      <Dialog
        open={confirm === 'review'}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="Mark this session reviewed?"
        description="This records that an analyst has inspected the session."
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(null)}>Cancel</Button>
            <Button
              loading={actions.markReviewed.isPending}
              onClick={() => actions.markReviewed.mutate(session.id, { onSuccess: () => { setConfirm(null); toast('Session marked reviewed', { tone: 'success' }); } })}
            >
              Mark reviewed
            </Button>
          </>
        }
      />
      <Dialog
        open={confirm === 'quarantine'}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="Quarantine this session?"
        description="The agent's credential will be isolated pending investigation. Illustrative in Wave 1."
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(null)}>Cancel</Button>
            <Button
              variant="danger"
              loading={actions.quarantine.isPending}
              onClick={() => actions.quarantine.mutate(session.id, { onSuccess: () => { setConfirm(null); toast('Session quarantined', { tone: 'critical' }); } })}
            >
              Quarantine
            </Button>
          </>
        }
      />
    </aside>
  );
}

function Replay({ session }: { session: AgentSession }) {
  const [selectedId, setSelectedId] = useState(session.steps[0]?.id ?? '');
  const selected = session.steps.find((s) => s.id === selectedId) ?? session.steps[0];
  const anomalyIds = useMemo(() => session.steps.filter((s) => s.anomaly).map((s) => s.id), [session.steps]);

  const jumpAnomaly = (dir: 1 | -1) => {
    if (anomalyIds.length === 0) return;
    const curIndex = anomalyIds.indexOf(selectedId);
    let next: string;
    if (curIndex === -1) {
      next = dir === 1 ? anomalyIds[0] : anomalyIds[anomalyIds.length - 1];
    } else {
      next = anomalyIds[(curIndex + dir + anomalyIds.length) % anomalyIds.length];
    }
    setSelectedId(next);
    announce(`Anomaly step selected`);
  };

  const items: TimelineItem[] = session.steps.map((step, i) => {
    const Icon = STEP_ICON[step.kind];
    return {
      id: step.id,
      icon: <Icon className="h-3.5 w-3.5" aria-hidden="true" />,
      title: (
        <span className="inline-flex items-center gap-1.5">
          {step.anomaly && <TriangleAlert className="h-3.5 w-3.5 text-crit-fg" aria-label="Anomaly" />}
          {STEP_LABEL[step.kind]}
        </span>
      ),
      meta: `#${i + 1}`,
      tone: step.anomaly ? 'anomaly' : step.id === selectedId ? 'active' : 'default',
      selected: step.id === selectedId,
      onSelect: () => setSelectedId(step.id),
    };
  });

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_var(--rail-w)] xl:items-start">
      <div className="grid gap-4 md:grid-cols-[280px_minmax(0,1fr)] md:items-start">
        <Card>
          <CardHeader
            title="Timeline"
            action={
              anomalyIds.length > 0 ? (
                <span className="flex items-center gap-0.5">
                  <button type="button" aria-label="Previous anomaly" onClick={() => jumpAnomaly(-1)} className="rounded p-1 text-text-tertiary hover:bg-surface-hover hover:text-text">
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <span className="text-[length:var(--fs-micro)] text-text-tertiary">anomaly</span>
                  <button type="button" aria-label="Next anomaly" onClick={() => jumpAnomaly(1)} className="rounded p-1 text-text-tertiary hover:bg-surface-hover hover:text-text">
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </span>
              ) : undefined
            }
          />
          <CardBody className="max-h-[600px] overflow-y-auto">
            <Timeline items={items} ariaLabel="Session steps" />
          </CardBody>
        </Card>
        {selected && <StepDetail step={selected} />}
      </div>
      <SideRail session={session} />
    </div>
  );
}

export function SessionReplayScreen() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const query = useSession(sessionId);

  return (
    <div>
      <ScreenHeader
        eyebrow="Know · Intelligence · Session Replay"
        title={query.data ? query.data.identityName : 'Session Replay'}
        description={query.data ? `Started ${dateTime(query.data.startedAt)} · ${pluralize(query.data.steps.length, 'step')}` : undefined}
        actions={
          <Button variant="ghost" size="sm" leadingIcon={<ChevronLeft className="h-4 w-4" />} onClick={() => navigate('/intelligence')}>
            All sessions
          </Button>
        }
      />

      {query.isPending ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_var(--rail-w)]">
          <Skeleton className="h-[500px]" />
          <Skeleton className="h-[500px]" />
        </div>
      ) : query.isError ? (
        <ErrorState message="We couldn't load this session." onRetry={() => query.refetch()} />
      ) : !query.data ? (
        <EmptyState headline="Session not found" guidance="This session id doesn't match a captured session." />
      ) : (
        <Replay session={query.data} />
      )}
    </div>
  );
}
