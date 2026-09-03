import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Boxes, ChevronRight, GitCompareArrows, ShieldAlert, Unlink } from 'lucide-react';
import { useOverview } from './queries';
import { NHI_TYPES, NHI_TYPE_LABELS, type NhiType } from '@/mocks/types';
import { screenHeaderProps } from '@/app/nav';
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
import { count, date, dateTime, percent, relativeTime } from '@/lib/format';
import { Banner } from '@/components/ui/Banner';
import type { OverviewData } from '@/mocks/api';
// SEVERITY_FG (not a filled badge): the old badge was redundant with the left
// risk spine (severity was triple-encoded), so it read as a stacked wall of
// identical pills when every alert is critical.
import { SEVERITY_FG } from '@/lib/tones';

/**
 * Mirrors the loaded layout — meta line, then a 4-tile Portfolio group and a 5-tile
 * By type group, each with its label. It previously drew the two tile grids alone,
 * missing the meta line and both group labels, so the whole page shifted downward
 * as data arrived. A skeleton that lies about the layout is worse than none: it
 * spends the user's attention on a shape that is about to move.
 *
 * The By type group still settles ~44px lower than its placeholder, because the
 * caption beside that label ("one type each, summing to N") has no bar here. Not
 * worth a third skeleton line for a group label plus caption on one row.
 */
function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-4 w-96 max-w-full" />
      <div className="space-y-5">
        <div>
          <Skeleton className="mb-1.5 h-4 w-20" />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[var(--size-kpi-tile)]" />
            ))}
          </div>
        </div>
        <div>
          <Skeleton className="mb-1.5 h-4 w-16" />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-[var(--size-kpi-tile)]" />
            ))}
          </div>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-72 lg:col-span-2" />
        <Skeleton className="h-72" />
      </div>
    </div>
  );
}

/**
 * Sync recency. Every figure on this screen is a point-in-time count, so it needs
 * an "as of" — an unstamped number is unauditable. Past STALE_SYNC_MINUTES the
 * stamp is replaced by a banner, because a silently stale console is worse than
 * one that admits it.
 * // ASSUMPTION: real sync scheduling, and the retry action, are upstream.
 */
const STALE_SYNC_MINUTES = 60;

/**
 * Dedup result + sync recency on one line.
 *
 * These began as two stacked paragraphs, which pushed the header to five lines of
 * prose before any content — too tall. Both are single facts, so they sit on one
 * line separated by a divider, wrapping only when the viewport forces it.
 *
 * The dedup figure is the product's core claim and was otherwise only inferable by
 * opening a row and counting sources. The "as of" matters because every figure
 * here is a point-in-time count — an unstamped number is unauditable — and past
 * STALE_SYNC_MINUTES it escalates to a banner, since a silently stale console is
 * worse than one that admits it.
 * // ASSUMPTION: real sync scheduling, and the retry action, are upstream.
 */
function DashboardMeta({ data }: { data: OverviewData }) {
  const { sourceInstances, total, lastSyncAt } = data;
  const stale = (Date.now() - new Date(lastSyncAt).getTime()) / 60000 > STALE_SYNC_MINUTES;

  if (stale) {
    return (
      <Banner tone="warning">
        <span className="font-medium">Data may be out of date.</span> The last successful cloud sync
        completed {relativeTime(lastSyncAt)} ({dateTime(lastSyncAt)}). Counts below reflect that sync,
        not the current state of your clouds.
      </Banner>
    );
  }

  return (
    <p className="flex flex-wrap items-baseline gap-x-2 text-[length:var(--fs-small)] text-text-tertiary">
      {sourceInstances > 0 && total > 0 && (
        <span>
          <span className="tnum font-medium text-text">{count(sourceInstances)}</span> source instances{' '}
          <span aria-hidden="true">→</span>{' '}
          <span className="tnum font-medium text-text">{count(total)}</span> correlated identities{' '}
          <span className="tnum text-accent-text">({percent(1 - total / sourceInstances)} dedup)</span>
        </span>
      )}
      <span>
        <span aria-hidden="true">·</span> as of{' '}
        <span className="tnum text-text-secondary">{dateTime(lastSyncAt)}</span>
      </span>
    </p>
  );
}

/**
 * Label for a KPI group *within* the screen.
 *
 * These were `.eyebrow`, which globals.css reserves as the single uppercase style
 * in the product, coloured with the accent — the page-level eyebrow above the h1.
 * Reusing it here made "Portfolio" and "By type" read as peers of "See · Dashboard"
 * rather than as sections inside the page. Sentence case, neutral colour, and no
 * letter-spacing put them clearly below the h1 in the hierarchy and leave the
 * accent eyebrow unique to page location.
 */
const GROUP_LABEL = 'text-[length:var(--fs-small)] font-semibold text-text-secondary';

/**
 * Two labelled groups: portfolio totals, then the per-type partition.
 *
 * The five per-type tiles previously sat interleaved with the portfolio tiles
 * across two rows, so nothing signalled that they partition the total — inviting
 * a reader to sum a subset and conclude the figures did not reconcile. (They
 * always did: the tiles are counts over one seeded dataset.) Grouping the five
 * together under "By type" and stating the sum makes the partition legible
 * without a data change.
 */
function Kpis({ data }: { data: OverviewData }) {
  const byType = new Map<NhiType, number>(data.typeBreakdown.map((t) => [t.type, t.count]));
  // Derived from the same breakdown that feeds the tiles, so the stated sum cannot
  // drift from what is rendered.
  const typeTotal = data.typeBreakdown.reduce((n, t) => n + t.count, 0);
  /* No trend arrows on these tiles, deliberately.
   *
   * Two of them previously carried hardcoded deltas (delta={6}, delta={-9}) and two
   * carried none, so the two without read as static while the two with could
   * contradict their own counts. Deriving them from the dataset was worse: each
   * identity's riskSeries is a random walk forced to land on today's score, so scores
   * wander above 80 mid-series and a derived 7-day critical delta came out at -37
   * against a count of 20 — i.e. 57 criticals last week, which is an artifact of the
   * generator, not a trend. The orphan and conflict flags carry no history at all, so
   * those deltas were +1 and 0.
   *
   * A KPI trend must be something you can stand behind; this data supports none. The
   * Activity card carries the only genuine time series on the screen.
   * // ASSUMPTION: real trend history is upstream.
   */

  return (
    <div className="space-y-5">
      <div>
        <div className={cn('mb-1.5', GROUP_LABEL)}>Portfolio</div>
        {/* Both groups share one breakpoint ladder — 2-up, then full-width at lg.
            Portfolio was md:grid-cols-4 while By type was md:grid-cols-3, so between
            768px and 1024px the two rows disagreed on column count and their tile
            edges did not line up. */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {/* No sparkline here. It plotted `activity.discovered` — identities found
              per day — under a value showing the cumulative total, so the trendline
              did not trend its own number. The Activity card below already shows that
              series properly, with axes, a legend and a date range. */}
          {/* Boxes, matching the inventory's identical "Total identities" tile — the
              same metric was wearing two different icons on two screens. ShieldAlert
              also read as a warning on what is a neutral count. */}
          <KpiTile
            label="Total identities"
            value={data.total}
            to="/discover"
            prominent
            icon={<Boxes className="h-4 w-4" />}
          />
          <KpiTile
            label="Critical risk"
            value={data.riskBreakdown.critical}
            to="/discover?band=critical"
            icon={<AlertTriangle className="h-4 w-4" />}
            risk="critical"
          />
          <KpiTile
            label="Orphaned"
            value={data.orphaned}
            to="/discover?orphaned=1"
            icon={<Unlink className="h-4 w-4" />}
          />
          {/* GitCompareArrows, not Unlink: Orphaned already owns Unlink, and two
              different metrics sharing one glyph is a legibility bug. This matches the
              icon the inventory's conflict flag uses, so the concept looks the same
              wherever it appears. */}
          <KpiTile
            label="Attribute conflicts"
            value={data.conflicts}
            to="/discover?conflicts=1"
            icon={<GitCompareArrows className="h-4 w-4" />}
          />
        </div>
      </div>

      <div>
        {/* The caption sits beside its label, not right-aligned across the full width —
            at 1590px it was the longest text on the screen, in the quietest colour,
            furthest from the thing it explains. */}
        <div className="mb-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <div className={GROUP_LABEL}>By type</div>
          <p className="text-[length:var(--fs-micro)] text-text-tertiary">
            · one type each, summing to{' '}
            <span className="tnum text-text-secondary">{count(typeTotal)}</span>
          </p>
        </div>
        {/* KPI cards, matching the Portfolio group above. A stacked composition bar was
            tried here and reverted — the card treatment reads better and keeps one
            consistent object on the screen. The share of total each type represents,
            which the bar showed and cards do not, is carried by each card's `caption`
            so the proportion is still legible without doing the arithmetic. */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {NHI_TYPES.map((t) => {
            const value = byType.get(t) ?? 0;
            return (
              <KpiTile
                key={t}
                label={NHI_TYPE_LABELS[t]}
                value={value}
                to={`/discover?type=${t}`}
                icon={<NhiTypeIcon type={t} className="h-4 w-4" />}
                caption={typeTotal > 0 ? `${percent(value / typeTotal)} of total` : undefined}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ActivityCard({ data }: { data: OverviewData }) {
  // The x axis labels bare day numbers so all 14 fit without collisions, so the
  // month lives here instead — otherwise the range would be unreadable across a
  // month boundary.
  const points = data.activity;
  const day = (iso: string) => date(iso).replace(/,.*/, '');
  const range = points.length > 0 ? ` (${day(points[0].t)} – ${day(points[points.length - 1].t)})` : '';
  return (
    <Card className="flex flex-col lg:col-span-2">
      <CardHeader
        title="Activity"
        description={`Identities discovered and alerts raised over the last 14 days${range}.`}
      />
      <CardBody className="flex flex-1 flex-col">
        {/*
          No legend row here. Each panel now carries its own series name above its
          plot, which is strictly better than a shared key above both: the label sits
          beside the line it names, and it is what tells the two stacked y axes apart.
          A legend as well would be the same information twice.

          h-[280px] is a definite height on purpose. Recharts' ResponsiveContainer is
          height:100%, which collapses to 0 against an auto-height parent — `flex-1`
          alone only works while this card is a stretched grid item. Keeping an
          explicit height means the chart survives a layout change. It absorbs the
          two panel labels and the rule between them that replaced the legend.
        */}
        <div
          role="img"
          aria-label="Area chart of identities discovered and alerts raised over the last 14 days."
          className="h-[280px] flex-1"
        >
          <ActivityChart data={data.activity} />
        </div>
        {/*
          Accessible data-table fallback for the chart. `sr-only` goes on a wrapping
          div, not the <table>: table layout treats height as a minimum and ignores
          overflow:hidden, so `sr-only` on the table itself leaves a full-height
          absolutely-positioned element that extends the page's scroll height.
        */}
        <div className="sr-only">
          <table>
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
        </div>
      </CardBody>
    </Card>
  );
}

function PriorityAlerts({ data }: { data: OverviewData }) {
  return (
    <Card className="flex flex-col">
      {/* Says what it counts. "Critical risk 21" sits a few hundred pixels away,
          and both are correct — 21 critical *identities*, N open *alerts* — but
          nothing on screen distinguished the two units, inviting the reader to
          treat one as a subset of the other. */}
      <CardHeader
        title="Priority alerts"
        description={`Showing ${Math.min(data.topAlerts.length, 6)} of ${count(data.openAlerts)} open alerts, highest severity first. Alerts are events, not identities.`}
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
      {/* The description ("Every non-human identity across your clouds, deduplicated
          and correlated — calm by default.") is removed. It restated in prose what the
          meta line below now states with figures, and cost a line in a header that had
          grown too tall. Other screens keep their descriptions. */}
      <ScreenHeader
        {...screenHeaderProps('/')}
        // ScreenHeader's default mb-6 is sized for a header that ends in a
        // description paragraph. With the description removed the h1 sits directly
        // above the meta line, so 24px plus the h1's own leading read as a hole.
        // twMerge replaces the default rather than stacking with it.
        className="mb-2.5"
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
          <div className="space-y-5">
            <DashboardMeta data={data} />
            <div className="space-y-6">
              <Kpis data={data} />
              <div className="grid gap-4 lg:grid-cols-3">
                <ActivityCard data={data} />
                <PriorityAlerts data={data} />
              </div>
            </div>
          </div>
        )}
      </QueryBoundary>
    </div>
  );
}
