import { useMemo, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Activity,
  AlertCircle,
  AlertOctagon,
  AlertTriangle,
  BellOff,
  ChevronRight,
  Circle,
  CircleCheck,
  Info,
  Radar,
  type LucideIcon,
} from 'lucide-react';
import { useAlerts } from './queries';
import type { Alert, RiskBand } from '@/mocks/types';
import { bucketByTime, splitAcknowledged } from './alertGrouping';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { FilterPill } from '@/components/ui/FilterPill';
import { QueryBoundary } from '@/components/ui/QueryBoundary';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonTableRows } from '@/components/ui/Skeleton';
import { pluralize, relativeTime } from '@/lib/format';
import { cn } from '@/lib/cn';
import { SEVERITY_TONE } from '@/lib/tones';

// Shape (icon), not hue alone, distinguishes severity — colourblind safe.
const SEVERITY_ICON: Record<RiskBand, LucideIcon> = {
  critical: AlertOctagon,
  high: AlertTriangle,
  medium: AlertCircle,
  low: Info,
  minimal: Circle,
};
const SEVERITY_ORDER: RiskBand[] = ['critical', 'high', 'medium', 'low'];

function BaselineStrip({ alerts }: { alerts: Alert[] }) {
  const learning = alerts.find((a) => a.baseline === 'learning' && a.baselineProgress);
  if (learning && learning.baselineProgress) {
    const { day, of } = learning.baselineProgress;
    const pct = Math.round((day / of) * 100);
    return (
      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-3 px-4 py-3">
          <Radar className="h-4 w-4 text-warn-fg" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <span className="text-[length:var(--fs-small)] font-medium text-text">Baseline still learning</span>
              <span className="tnum text-[length:var(--fs-small)] text-text-secondary">day {day} of {of}</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2">
              <div className="h-full rounded-full bg-[var(--warning)]" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>
        <div className="border-t border-border px-4 py-2 text-[length:var(--fs-micro)] text-text-tertiary">
          Early signal may be noisy — alerts during the learning window are not yet fully trustworthy.
        </div>
      </Card>
    );
  }
  return (
    <Card className="mb-4">
      <div className="flex items-center gap-3 px-4 py-3">
        <CircleCheck className="h-4 w-4 text-[var(--success)]" aria-hidden="true" />
        <span className="text-[length:var(--fs-small)] text-text">
          Baseline established — monitoring is calibrated and alerts reflect deviations from normal behavior.
        </span>
      </div>
    </Card>
  );
}

function AlertRow({ alert, onOpen }: { alert: Alert; onOpen: () => void }) {
  const SevIcon = SEVERITY_ICON[alert.severity];
  return (
    <button
      type="button"
      onClick={onOpen}
      // Left severity rail double-encodes severity by colour + position.
      style={{ borderLeftColor: `var(--risk-${alert.severity})` }}
      className="flex w-full items-start gap-3 border-b border-l-[3px] border-border px-4 py-3 text-left last:border-b-0 hover:bg-surface-hover"
    >
      <Badge tone={SEVERITY_TONE[alert.severity]} icon={<SevIcon className="h-3 w-3" />} className="mt-0.5 shrink-0 capitalize">
        {alert.severity}
      </Badge>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium text-text">{alert.title}</span>
          {alert.baseline === 'learning' && (
            <Badge tone="neutral" className="shrink-0">learning</Badge>
          )}
        </div>
        <p className="mt-0.5 truncate text-[length:var(--fs-small)] text-text-secondary">{alert.description}</p>
        <p className="mt-0.5 font-mono text-[length:var(--fs-micro)] text-text-tertiary">{alert.identityId}</p>
      </div>
      <span className="tnum shrink-0 text-[length:var(--fs-small)] text-text-tertiary">{relativeTime(alert.createdAt)}</span>
    </button>
  );
}

/** Settled alerts, out of the inline flow but at full contrast when expanded. */
function AcknowledgedSection({ alerts, onOpen }: { alerts: Alert[]; onOpen: (a: Alert) => void }) {
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
  const navigate = useNavigate();
  const location = useLocation();
  const [severity, setSeverity] = useState<RiskBand | null>(null);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    (query.data ?? []).forEach((a) => (c[a.severity] = (c[a.severity] ?? 0) + 1));
    return c;
  }, [query.data]);

  const openAlert = (a: Alert) => navigate({ pathname: `/monitor/${a.id}`, search: location.search });

  return (
    <div>
      <ScreenHeader
        eyebrow="Know · Monitor"
        title="Monitor"
        description="Behavioral alerts on your identities, with an honest view of how settled the baseline is."
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
          const filtered = severity ? alerts.filter((a) => a.severity === severity) : alerts;
          const { active, acknowledged } = splitAcknowledged(filtered);
          const buckets = bucketByTime(active);
          return (
            <div>
              <BaselineStrip alerts={alerts} />

              <div className="mb-3 flex flex-wrap items-center gap-1.5">
                <FilterPill label="All" count={alerts.length} selected={severity === null} onClick={() => setSeverity(null)} />
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
              </div>

              <Card>
                {filtered.length === 0 ? (
                  <EmptyState icon={<Activity className="h-5 w-5" />} headline="No alerts at this severity" guidance="Clear the severity filter to see all open alerts." />
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
