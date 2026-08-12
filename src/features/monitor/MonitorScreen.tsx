import { useMemo, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Activity, BellOff, ChevronRight, X } from 'lucide-react';
import { useAlerts, useMonitoringBaseline } from './queries';
import { BaselineStrip } from './BaselineStrip';
import { useMonitorFilters } from './useMonitorFilters';
import type { AlertWithIdentity } from '@/mocks/api';
import type { RiskBand } from '@/mocks/types';
import { bucketByTime, splitAcknowledged } from './alertGrouping';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { NhiTypeIcon } from '@/components/ui/NhiTypeIcon';
import { FilterPill } from '@/components/ui/FilterPill';
import { QueryBoundary } from '@/components/ui/QueryBoundary';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonTableRows } from '@/components/ui/Skeleton';
import { pluralize, relativeTime } from '@/lib/format';
import { cn } from '@/lib/cn';
import { SEVERITY_FG } from '@/lib/tones';

const SEVERITY_ORDER: RiskBand[] = ['critical', 'high', 'medium', 'low'];


/**
 * Two lines: what happened, then who and when.
 *
 * This carries exactly the four things FRS 3.7 asks the feed to show — severity,
 * identity, type of anomaly (the title), and time. The alert's description is detail,
 * not feed data, so it lives in the drawer; on a row it repeated across alerts drawn
 * from the same template and made distinct alerts look like duplicates.
 *
 * Severity leads the meta line as letter-spaced caps rather than a pill. A pill's width
 * tracks its word — "Critical" runs wider than "High" — so in the flow it shifted every
 * following element and the feed read as a ragged left edge.
 */
function AlertRow({ alert, onOpen }: { alert: AlertWithIdentity; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative flex w-full items-start gap-3 border-b border-border py-3 pl-4 pr-3 text-left last:border-b-0 hover:bg-surface-hover"
    >
      {/* Severity mark. As an edge-to-edge left border this ran unbroken from row to
          row, so adjacent bands — medium #d6a93c above high #e8913d — blended into one
          continuous stripe instead of reading as one mark per alert. Spanning the text
          block keeps it tied to its own row. */}
      <span
        aria-hidden="true"
        className="absolute bottom-3 left-0 top-3 w-[3px] rounded-full"
        style={{ backgroundColor: `var(--risk-${alert.severity})` }}
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium text-text">{alert.title}</span>
          {alert.baseline === 'learning' && (
            <Badge tone="neutral" className="shrink-0">learning</Badge>
          )}
        </div>

        <div className="mt-1 flex min-w-0 items-center gap-2 text-[length:var(--fs-micro)] text-text-tertiary">
          {/* SEVERITY_FG, not --risk-*: the risk hues are fills, tuned for spines and
              dots. As text on the row they clear AA at rest but critical falls to
              3.6:1 against --surface-hover, so hovering a row would drop its own label
              below contrast. These foregrounds are tuned for that. */}
          <span className={cn('shrink-0 font-semibold uppercase tracking-[0.12em]', SEVERITY_FG[alert.severity])}>
            {alert.severity}
          </span>
          <span aria-hidden="true">·</span>
          <NhiTypeIcon type={alert.identityType} className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate font-mono">{alert.identityName}</span>
          <span aria-hidden="true">·</span>
          <span className="tnum whitespace-nowrap">{relativeTime(alert.createdAt)}</span>
        </div>
      </div>

      <ChevronRight
        className="mt-0.5 h-4 w-4 shrink-0 text-text-tertiary group-hover:text-text-secondary"
        aria-hidden="true"
      />
    </button>
  );
}

/** Settled alerts, out of the inline flow but at full contrast when expanded. */
function AcknowledgedSection({
  alerts,
  onOpen,
}: {
  alerts: AlertWithIdentity[];
  onOpen: (a: AlertWithIdentity) => void;
}) {
  const [open, setOpen] = useState(false);
  if (alerts.length === 0) return null;
  return (
    <div className="border-t border-border">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-[length:var(--fs-small)] font-medium text-text-secondary hover:bg-surface-hover"
      >
        <ChevronRight className={cn('h-4 w-4 shrink-0 transition-transform', open && 'rotate-90')} aria-hidden="true" />
        {pluralize(alerts.length, 'acknowledged alert')}
      </button>
      {open && (
        <div>
          {alerts.map((a) => (
            <AlertRow key={a.id} alert={a} onOpen={() => onOpen(a)} />
          ))}
        </div>
      )}
    </div>
  );
}

export function MonitorScreen() {
  const query = useAlerts();
  const baseline = useMonitoringBaseline();
  const navigate = useNavigate();
  const location = useLocation();
  const { severity, setSeverity, learningOnly, showLearningOnly, clearLearningOnly } =
    useMonitorFilters();

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    (query.data ?? []).forEach((a) => (c[a.severity] = (c[a.severity] ?? 0) + 1));
    return c;
  }, [query.data]);

  // Alerts the baseline caveat actually applies to — the strip's link promises this count.
  const learningCount = useMemo(
    () => (query.data ?? []).filter((a) => a.baseline === 'learning').length,
    [query.data],
  );

  const openAlert = (a: AlertWithIdentity) =>
    navigate({ pathname: `/monitor/${a.id}`, search: location.search });

  return (
    <div>
      <ScreenHeader
        eyebrow="Know · Monitor"
        title="Monitor"
        description="Behavioral alerts on your identities, with an honest view of how settled the baseline is."
      />

      {/* Outside the feed's boundary on purpose. An empty feed is exactly where coverage
          matters most — "no open alerts" over partial coverage is not all-clear, it means
          most of the estate is unobserved — and inside the boundary this never rendered
          in the empty or error states. */}
      <BaselineStrip
        baseline={baseline.data}
        loading={baseline.isPending}
        failed={baseline.isError}
        affectedAlerts={learningCount}
        onShowAffected={showLearningOnly}
        onRetry={() => void baseline.refetch()}
      />

      <QueryBoundary
        query={query}
        loadingFallback={
          <>
            <div className="mb-4 h-16 rounded-[var(--r-lg)] border border-border bg-surface" />
            <Card><SkeletonTableRows rows={6} cols={3} /></Card>
          </>
        }
        isEmpty={(d) => d.length === 0}
        empty={
          <Card>
            <EmptyState
              icon={<BellOff className="h-5 w-5" />}
              headline="No open alerts"
              guidance="All clear. New behavioral alerts will appear here as they are raised."
            />
          </Card>
        }
      >
        {(alerts) => {
          const bySeverity = severity ? alerts.filter((a) => a.severity === severity) : alerts;
          const filtered = learningOnly
            ? bySeverity.filter((a) => a.baseline === 'learning')
            : bySeverity;
          const { active, acknowledged } = splitAcknowledged(filtered);
          const buckets = bucketByTime(active);
          return (
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-1.5">
                <FilterPill label="All" count={alerts.length} selected={severity === null && !learningOnly} onClick={() => { setSeverity(null); clearLearningOnly(); }} />
                {SEVERITY_ORDER.map((s) => (
                  <FilterPill
                    key={s}
                    label={s[0].toUpperCase() + s.slice(1)}
                    count={counts[s] ?? 0}
                    selected={severity === s}
                    onClick={() => setSeverity(severity === s ? null : s)}
                    icon={<span className={cn('inline-block h-2 w-2 rounded-full')} style={{ backgroundColor: `var(--risk-${s})` }} aria-hidden="true" />}
                  />
                ))}
                {/* Only while active — the strip's link is what turns it on, so an
                    always-present pill would advertise a dimension most tenants never use. */}
                {learningOnly && (
                  <FilterPill
                    label={
                      <span className="inline-flex items-center gap-1.5">
                        Still learning
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                      </span>
                    }
                    count={learningCount}
                    selected
                    onClick={clearLearningOnly}
                  />
                )}
              </div>

              <Card>
                {filtered.length === 0 ? (
                  <EmptyState
                    icon={<Activity className="h-5 w-5" />}
                    headline={learningOnly ? 'No alerts from learning identities' : 'No alerts at this severity'}
                    guidance="Clear the filter to see all open alerts."
                  />
                ) : (
                  <div>
                    {buckets.map((bucket) => (
                      <section key={bucket.label} aria-label={bucket.label}>
                        <h2 className="eyebrow sticky top-0 z-[var(--z-raised)] flex items-center justify-between border-b border-border bg-surface px-4 py-2">
                          <span>{bucket.label}</span>
                          <span className="tnum text-text-tertiary">{bucket.alerts.length}</span>
                        </h2>
                        {bucket.alerts.map((a) => (
                          <AlertRow key={a.id} alert={a} onOpen={() => openAlert(a)} />
                        ))}
                      </section>
                    ))}
                    {active.length === 0 && (
                      <p className="px-4 py-3 text-[length:var(--fs-small)] text-text-secondary">No open alerts — all settled below.</p>
                    )}
                    <AcknowledgedSection alerts={acknowledged} onOpen={openAlert} />
                  </div>
                )}
              </Card>
            </div>
          );
        }}
      </QueryBoundary>

      <Outlet />
    </div>
  );
}
