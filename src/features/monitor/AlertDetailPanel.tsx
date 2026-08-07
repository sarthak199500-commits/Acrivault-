import { useNavigate, useParams, useLocation, Link } from 'react-router-dom';
import { CheckCheck, CircleCheck, Lightbulb, Sparkles } from 'lucide-react';
import { useAlert, useAlertActions, useAlertIdentity, useAlertSession } from './queries';
import type { AlertWithIdentity } from '@/mocks/api';
import { Drawer } from '@/components/ui/Drawer';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Banner } from '@/components/ui/Banner';
import { Sparkline } from '@/components/ui/Sparkline';
import { KeyValueList } from '@/components/ui/KeyValueList';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { SkeletonText, Skeleton } from '@/components/ui/Skeleton';
import { RoleRestricted } from '@/components/ui/RoleRestricted';
import { useCan } from '@/components/ui/Can';
import { riskBand } from '@/lib/risk';
import { dateTime, pluralize } from '@/lib/format';
import { toast } from '@/stores/toast';
import { useUiStore } from '@/stores/ui';
import { SEVERITY_TONE } from '@/lib/tones';


function Body({ alert }: { alert: AlertWithIdentity }) {
  const identityQuery = useAlertIdentity(alert.identityId);
  const identity = identityQuery.data;
  const band = identity ? riskBand(identity.riskScore) : null;
  // FRS 3.7: alerts link to the identity and, for agents, the session replay.
  const sessionQuery = useAlertSession(alert.identityId, identity?.type === 'ai-agent');
  const session = sessionQuery.data;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge tone={SEVERITY_TONE[alert.severity]} className="capitalize">{alert.severity}</Badge>
        {alert.baseline === 'learning' && <Badge tone="neutral">baseline learning</Badge>}
        <Badge tone={alert.status === 'open' ? 'warning' : 'info'} className="capitalize">{alert.status}</Badge>
      </div>

      <p className="mb-4 text-[length:var(--fs-body)] text-text-secondary">{alert.description}</p>

      <Banner tone="info" icon={<Lightbulb className="h-4 w-4" />} className="mb-4">
        <span className="font-medium text-text">Recommended next step</span>
        <span className="mt-0.5 block text-text-secondary">{alert.recommendedNextStep}</span>
      </Banner>

      {alert.baseline === 'learning' && alert.baselineProgress && (
        <p className="mb-4 text-[length:var(--fs-small)] text-text-tertiary">
          This alert was raised while the baseline is still learning (day {alert.baselineProgress.day} of{' '}
          {alert.baselineProgress.of}). Treat it as a lead, not a verdict.
        </p>
      )}

      <section className="mb-5">
        <h3 className="eyebrow mb-2">Related identity</h3>
        {identityQuery.isPending ? (
          <SkeletonText lines={3} />
        ) : identity && band ? (
          <div className="rounded-[var(--r-md)] border border-border bg-surface-2 p-3">
            <div className="mb-2 flex items-center justify-between">
              <Link to={`/discover/${identity.id}`} className="font-mono text-[length:var(--fs-small)] text-accent-text hover:underline">
                {identity.name}
              </Link>
              <span className="tnum text-[length:var(--fs-small)]" style={{ color: band.cssVar }}>risk {identity.riskScore}</span>
            </div>
            <Sparkline values={identity.riskSeries.map((p) => p.score)} width={300} height={48} stroke={band.cssVar} ariaLabel="Identity risk over the last 14 days" />
            <div className="mt-2">
              <KeyValueList
                items={[
                  { label: 'Owner', value: identity.owner ?? '—' },
                  { label: 'Type', value: identity.type },
                  { label: 'Governance', value: identity.governanceStatus, derived: true },
                ]}
              />
            </div>
          </div>
        ) : null}
      </section>

      {identity?.type === 'ai-agent' && (
        <section className="mb-5">
          <h3 className="eyebrow mb-2">Agent session</h3>
          {sessionQuery.isPending ? (
            <SkeletonText lines={1} />
          ) : session ? (
            <Link
              to={`/intelligence/${session.id}`}
              className="flex items-center justify-between gap-3 rounded-[var(--r-md)] border border-border bg-surface-2 px-3 py-2.5 hover:border-border-strong"
            >
              <span className="inline-flex items-center gap-2 text-[length:var(--fs-small)] text-accent-text">
                <Sparkles className="h-4 w-4 shrink-0" aria-hidden="true" />
                Open session replay
              </span>
              <span className="tnum shrink-0 text-[length:var(--fs-small)] text-text-tertiary">
                {pluralize(session.anomalyCount, 'anomalous step')}
              </span>
            </Link>
          ) : (
            <p className="text-[length:var(--fs-small)] text-text-tertiary">
              No recorded session for this agent yet.
            </p>
          )}
        </section>
      )}

      <KeyValueList items={[{ label: 'Raised', value: dateTime(alert.createdAt) }, { label: 'Alert id', value: alert.id, mono: true }]} />
    </div>
  );
}

function Footer({ alert, onResolved }: { alert: AlertWithIdentity; onResolved: () => void }) {
  const { acknowledge, resolve } = useAlertActions();
  const canAck = useCan('alert.acknowledge');
  const canResolve = useCan('alert.resolve');

  if (!canAck && !canResolve) {
    return <RoleRestricted note="Your role can review alerts but not act on them." />;
  }
  if (alert.status === 'resolved') {
    return <span className="inline-flex items-center gap-1.5 text-[length:var(--fs-small)] text-[var(--success)]"><CircleCheck className="h-4 w-4" /> Resolved</span>;
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      {canAck && alert.status === 'open' && (
        <Button
          variant="secondary"
          leadingIcon={<CheckCheck className="h-4 w-4" />}
          loading={acknowledge.isPending}
          onClick={() =>
            acknowledge.mutate(alert.id, {
              onSuccess: () => toast('Alert acknowledged', { description: 'Recorded in the audit log.' }),
            })
          }
        >
          Acknowledge
        </Button>
      )}
      {canResolve && (
        <Button
          leadingIcon={<CircleCheck className="h-4 w-4" />}
          loading={resolve.isPending}
          onClick={() =>
            resolve.mutate(alert.id, {
              onSuccess: () => {
                toast('Alert resolved', {
                  tone: 'success',
                  description: 'It leaves the active feed and is recorded in the audit log.',
                });
                onResolved();
              },
            })
          }
        >
          Resolve
        </Button>
      )}
    </div>
  );
}

export function AlertDetailPanel() {
  const { alertId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const query = useAlert(alertId);

  // Honor the dev Scenario Switcher's forced states here too — same precedence
  // and DEV gate as QueryBoundary and the Identity detail panel.
  const forcedState = useUiStore((s) => s.scenario.state);
  const forced = import.meta.env.DEV ? forcedState : undefined;
  const data = query.data;
  const showLoading = forced === 'loading' || (forced !== 'error' && query.isPending);
  const showError = !showLoading && (forced === 'error' || query.isError);
  const showEmpty = !showLoading && !showError && (forced === 'empty' || !data);

  const close = () => navigate({ pathname: '/monitor', search: location.search });

  return (
    <Drawer
      open
      onOpenChange={(o) => !o && close()}
      closeOnOutsideClick={false}
      title={!showLoading && !showError && !showEmpty && data ? data.title : 'Alert'}
      description="Behavioral alert detail"
    >
      {showLoading ? (
        <div className="space-y-4"><Skeleton className="h-6 w-32" /><SkeletonText lines={6} /></div>
      ) : showError ? (
        <ErrorState
          message="We couldn't load this alert."
          detail={forced === 'error' ? "scenario.state = 'error'" : undefined}
          onRetry={() => query.refetch()}
        />
      ) : showEmpty ? (
        <EmptyState headline="Alert not found" guidance="This alert id doesn't match an open alert." />
      ) : data ? (
        <>
          <Body alert={data} />
          <div className="mt-4 border-t border-border pt-4">
            <Footer alert={data} onResolved={close} />
          </div>
        </>
      ) : null}
    </Drawer>
  );
}
