import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, ChevronRight, ShieldAlert, Unlink } from 'lucide-react';
import { useOverview } from './queries';
import { NHI_TYPE_LABELS, type NhiType } from '@/mocks/types';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { KpiTile } from '@/components/ui/KpiTile';
import { QueryBoundary } from '@/components/ui/QueryBoundary';
import { useCan } from '@/components/ui/Can';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { buttonClasses } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { NhiTypeIcon } from '@/components/ui/NhiTypeIcon';
import { ActivityChart } from '@/components/charts/ActivityChart';
import { count, relativeTime } from '@/lib/format';
import type { OverviewData } from '@/mocks/api';
// SEVERITY_FG (not a filled badge): the old badge was redundant with the left
// risk spine (severity was triple-encoded), so it read as a stacked wall of
// identical pills when every alert is critical.
import { SEVERITY_FG } from '@/lib/tones';

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-[var(--size-kpi-tile)]" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-72 lg:col-span-2" />
        <Skeleton className="h-72" />
      </div>
    </div>
  );
}

function Kpis({ data }: { data: OverviewData }) {
  const byType = new Map<NhiType, number>(data.typeBreakdown.map((t) => [t.type, t.count]));
  const spark = data.activity.map((a) => a.discovered);

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
      <KpiTile
        label="AI Agents"
        value={byType.get('ai-agent') ?? 0}
        to="/discover?type=ai-agent"
        prominent
        icon={<NhiTypeIcon type="ai-agent" className="h-4 w-4" />}
        sparkline={spark}
        delta={12}
        deltaLabel="this week"
      />
      <KpiTile
        label="Total identities"
        value={data.total}
        to="/discover"
        icon={<ShieldAlert className="h-4 w-4" />}
      />
      <KpiTile
        label="Orphaned"
        value={data.orphaned}
        to="/discover?orphaned=1"
        icon={<Unlink className="h-4 w-4" />}
        // ASSUMPTION: synthetic trend — fewer orphaned is better, so a drop reads favorable.
        delta={-9}
        deltaLabel="this week"
        deltaInverted
      />
      <KpiTile
        label="Critical risk"
        value={data.riskBreakdown.critical}
        to="/discover?band=critical"
        icon={<AlertTriangle className="h-4 w-4" />}
        risk="critical"
        // ASSUMPTION: synthetic trend — rising critical risk is the wrong direction, so it reads red.
        delta={6}
        deltaLabel="this week"
        deltaInverted
      />
      {(['service-account', 'api-key', 'oauth-token', 'workload-identity'] as NhiType[]).map((t) => (
        <KpiTile
          key={t}
          label={NHI_TYPE_LABELS[t]}
          value={byType.get(t) ?? 0}
          to={`/discover?type=${t}`}
          icon={<NhiTypeIcon type={t} className="h-4 w-4" />}
        />
      ))}
    </div>
  );
}

function ActivityCard({ data }: { data: OverviewData }) {
  return (
    <Card className="flex flex-col lg:col-span-2">
      <CardHeader
        title="Activity"
        description="Identities discovered and alerts raised over the last 14 days."
      />
      <CardBody className="flex flex-1 flex-col">
        {/* Visible legend for sighted users — the alert series is the risk colour. */}
        <div className="mb-1 flex items-center gap-4 text-[length:var(--fs-micro)] text-text-secondary">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2.5 rounded-[2px] bg-accent" aria-hidden="true" />
            Discovered
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-0.5 w-3.5 rounded-full bg-[var(--warning)]" aria-hidden="true" />
            Alerts
          </span>
        </div>
        <div
          role="img"
          aria-label="Area chart of identities discovered and alerts raised over the last 14 days."
          className="flex-1 min-h-[260px]"
        >
          <ActivityChart data={data.activity} />
        </div>
        {/* Accessible data-table fallback for the chart. */}
        <table className="sr-only">
          <caption>Daily discovered identities and alerts</caption>
          <thead>
            <tr>
              <th scope="col">Day</th>
              <th scope="col">Discovered</th>
              <th scope="col">Alerts</th>
            </tr>
          </thead>
          <tbody>
            {data.activity.map((a) => (
              <tr key={a.t}>
                <td>{new Date(a.t).toDateString()}</td>
                <td>{a.discovered}</td>
                <td>{a.alerts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardBody>
    </Card>
  );
}

function PriorityAlerts({ data }: { data: OverviewData }) {
  return (
    <Card className="flex flex-col">
      <CardHeader
        title="Priority alerts"
        description="Highest-severity open alerts."
        action={
          <Link to="/monitor" className="inline-flex items-center gap-1 text-[length:var(--fs-small)] text-accent-text hover:underline">
            View all <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        }
      />
      <CardBody className="flex-1">
        {data.topAlerts.length === 0 ? (
          <p className="py-6 text-center text-[length:var(--fs-small)] text-text-tertiary">
            No open alerts. All clear.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {data.topAlerts.map((alert) => (
              <li key={alert.id}>
                <Link
                  to={`/monitor/${alert.id}`}
                  className="group flex items-stretch gap-3 py-2.5 transition-colors hover:bg-surface-hover"
                >
                  {/* Risk spine — the one risk-coloured moment; paired with the text label below for a11y. */}
                  <span
                    className="w-[3px] shrink-0 self-stretch rounded-full"
                    style={{ backgroundColor: `var(--risk-${alert.severity})` }}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[length:var(--fs-small)] font-medium text-text">{alert.title}</span>
                    <span className="mt-0.5 flex items-center gap-1.5 text-[length:var(--fs-micro)] text-text-tertiary">
                      <span className={cn('shrink-0 font-semibold uppercase tracking-[0.08em]', SEVERITY_FG[alert.severity])}>
                        {alert.severity}
                      </span>
                      {alert.identityName && alert.identityType && (
                        <>
                          <span aria-hidden="true">·</span>
                          <NhiTypeIcon type={alert.identityType} className="h-3 w-3 shrink-0" aria-hidden="true" />
                          <span className="min-w-0 truncate">{alert.identityName}</span>
                        </>
                      )}
                      <span aria-hidden="true">·</span>
                      <span className="shrink-0">{relativeTime(alert.createdAt)}</span>
                    </span>
                  </span>
                  <ChevronRight
                    className="h-4 w-4 shrink-0 self-center text-text-tertiary transition-transform group-hover:translate-x-0.5 group-hover:text-text-secondary"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}

export function DashboardScreen() {
  const query = useOverview();
  const canConnect = useCan('connector.manage');
  // On the empty dashboard the empty-state "Start onboarding" CTA is the single
  // entry point — suppress the header action so there aren't two differently
  // labelled routes to the same place on one screen.
  const isEmpty = query.data?.total === 0;

  return (
    <div>
      <ScreenHeader
        eyebrow="See · Dashboard"
        title="Overview"
        description="Every non-human identity across your clouds, deduplicated and correlated — calm by default."
        actions={
          canConnect && !isEmpty ? (
            <Link to="/onboarding" className={buttonClasses('secondary', 'sm')}>
              Add a cloud
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          ) : undefined
        }
      />

      <QueryBoundary
        query={query}
        loadingFallback={<DashboardSkeleton />}
        isEmpty={(d) => d.total === 0}
        empty={
          <Card>
            <EmptyState
              icon={<ShieldAlert className="h-5 w-5" />}
              headline="No identities discovered yet"
              guidance="Connect a cloud to begin discovery. Acrivault will correlate identities across AWS, GCP, and Azure."
              action={
                <Link to="/onboarding" className={buttonClasses('primary', 'md')}>
                  Start onboarding
                </Link>
              }
            />
          </Card>
        }
      >
        {(data) => (
          <div className="space-y-6">
            <Kpis data={data} />
            <div className="grid gap-4 lg:grid-cols-3">
              <ActivityCard data={data} />
              <PriorityAlerts data={data} />
            </div>
            <p className="tnum text-[length:var(--fs-micro)] text-text-tertiary">
              Showing {count(data.total)} correlated identities · counts reconcile with the inventory and per-type
              breakdown.
            </p>
          </div>
        )}
      </QueryBoundary>
    </div>
  );
}
