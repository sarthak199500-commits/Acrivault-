import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, FilterX, ShieldX, Sparkles, TriangleAlert, X } from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useSessions } from './queries';
import { applySessionFilter, useSessionFilters } from './useSessionFilters';
import type { AgentSessionWithIdentity } from '@/mocks/api';
import { riskBand } from '@/lib/risk';
import { bucketByTime } from '@/lib/timeBuckets';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { RiskPill } from '@/components/ui/RiskPill';
import { FilterPill } from '@/components/ui/FilterPill';
import { DebouncedSearch } from '@/components/ui/DebouncedSearch';
import { QueryBoundary } from '@/components/ui/QueryBoundary';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonTableRows } from '@/components/ui/Skeleton';
import { count, pluralize, relativeTime } from '@/lib/format';

/**
 * Above this the list virtualizes into one flat risk ranking; below it, rows render
 * plainly inside their recency buckets and every row stays in the tab order.
 *
 * Set well above any realistic tenant on purpose. Sessions scale at ~1.5 per AI agent
 * and agents are a few percent of an estate, so a 1,500-identity tenant lands near 90
 * rows — the threshold was 40, which meant the normal case silently lost its time
 * buckets and the screen's structure changed with the size of the data. Past 200 the
 * flat ranking is the deliberate trade: virtualized rows cannot carry sticky headers.
 */
const VIRTUALIZE_THRESHOLD = 200;
/** Only a first guess — rows wrap at narrow widths, so each one is measured. */
const ROW_ESTIMATE = 64;

/** Worst first inside a recency bucket: the score now tracks the session, so it sorts. */
const byRisk = (a: AgentSessionWithIdentity, b: AgentSessionWithIdentity) => b.riskScore - a.riskScore;

function SessionRow({ session, onOpen }: { session: AgentSessionWithIdentity; onOpen: () => void }) {
  // Calm by default: only elevated-risk rows get a coloured left rail.
  const band = riskBand(session.riskScore).band;
  const elevated = band === 'critical' || band === 'high';
  const hasAnomalies = session.anomalyCount > 0;
  return (
    <button
      type="button"
      onClick={onOpen}
      style={elevated ? { borderLeftColor: `var(--risk-${band})` } : undefined}
      className={
        'group flex w-full items-start gap-3 border-b border-b-border border-l-[3px] px-4 py-3 text-left last:border-b-0 hover:bg-surface-hover ' +
        (elevated ? '' : 'border-l-transparent')
      }
    >
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--r-sm)] bg-accent-tint text-accent-text">
        <Sparkles className="h-4 w-4" aria-hidden="true" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="min-w-0 truncate text-[length:var(--fs-small)] font-medium text-text">
            {session.identityName}
          </span>
          <Badge tone={session.reviewState === 'reviewed' ? 'info' : 'warning'} className="shrink-0 capitalize">
            {session.reviewState}
          </Badge>
          {session.identityStatus === 'quarantined' && (
            <Badge tone="critical" className="shrink-0" icon={<ShieldX className="h-3 w-3" />}>
              Quarantined
            </Badge>
          )}
          {/* Inline rather than a fixed 7rem column: at 375px that column stole 30% of
              the row and clipped the meta line on every single one. */}
          <span className="ml-auto shrink-0">
            <RiskPill score={session.riskScore} size="sm" />
          </span>
        </span>

        {/* Wraps instead of clipping — the anomaly count sits last and was the first
            thing lost at narrow widths, which is exactly the figure being scanned for. */}
        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[length:var(--fs-micro)] text-text-tertiary">
          <span>{relativeTime(session.startedAt)}</span>
          <span aria-hidden="true">·</span>
          <span className="tnum">{pluralize(session.steps.length, 'step')}</span>
          <span aria-hidden="true">·</span>
          <span className={'tnum inline-flex items-center gap-1 ' + (hasAnomalies ? 'text-crit-fg' : '')}>
            {hasAnomalies && <TriangleAlert className="h-3 w-3" aria-hidden="true" />}
            {pluralize(session.anomalyCount, 'anomaly', 'anomalies')}
          </span>
        </span>
      </span>
    </button>
  );
}

function VirtualSessionList({
  sessions,
  onOpen,
}: {
  sessions: AgentSessionWithIdentity[];
  onOpen: (s: AgentSessionWithIdentity) => void;
}) {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: sessions.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_ESTIMATE,
    overscan: 10,
  });
  return (
    <div
      ref={parentRef}
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scrollable region must be focusable (WCAG scrollable-region-focusable)
      tabIndex={0}
      role="list"
      aria-label="Agent sessions"
      style={{ height: 'calc(100vh - 22rem)' }}
      className="overflow-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--accent)_30%,transparent)]"
    >
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map((item) => {
          const session = sessions[item.index];
          return (
            <div
              key={session.id}
              role="listitem"
              // Measured, not assumed: a row is 64px wide-screen but wraps to ~86px on a
              // phone, and a fixed estimate mis-positioned every row past the first.
              data-index={item.index}
              ref={virtualizer.measureElement}
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${item.start}px)` }}
            >
              <SessionRow session={session} onOpen={() => onOpen(session)} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PlainSessionList({
  sessions,
  onOpen,
  label,
}: {
  sessions: AgentSessionWithIdentity[];
  onOpen: (s: AgentSessionWithIdentity) => void;
  label: string;
}) {
  return (
    <div role="list" aria-label={label}>
      {sessions.map((s) => (
        <div role="listitem" key={s.id}>
          <SessionRow session={s} onOpen={() => onOpen(s)} />
        </div>
      ))}
    </div>
  );
}

/**
 * Reviewed sessions, out of the inline flow but at full contrast when expanded — the
 * same treatment Monitor gives acknowledged alerts. Nothing used to leave this feed.
 */
function ReviewedSection({
  sessions,
  onOpen,
}: {
  sessions: AgentSessionWithIdentity[];
  onOpen: (s: AgentSessionWithIdentity) => void;
}) {
  const [open, setOpen] = useState(false);
  if (sessions.length === 0) return null;
  return (
    <div className="border-t border-border">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-[length:var(--fs-small)] font-medium text-text-secondary hover:bg-surface-hover"
      >
        <ChevronRight className={'h-4 w-4 shrink-0 transition-transform ' + (open ? 'rotate-90' : '')} aria-hidden="true" />
        {pluralize(sessions.length, 'reviewed session')}
      </button>
      {open && <PlainSessionList sessions={sessions} onOpen={onOpen} label="Reviewed sessions" />}
    </div>
  );
}

export function SessionListScreen() {
  const query = useSessions();
  const navigate = useNavigate();
  const { filter, setReview, toggleAnomalies, clearAgent, setSearch, clearAll, activeCount } =
    useSessionFilters();
  const openSession = (s: AgentSessionWithIdentity) => navigate(`/intelligence/${s.id}`);

  const all = useMemo(() => query.data ?? [], [query.data]);
  const counts = useMemo(
    () => ({
      open: all.filter((s) => s.reviewState === 'open').length,
      reviewed: all.filter((s) => s.reviewState === 'reviewed').length,
      anomalous: all.filter((s) => s.anomalyCount > 0).length,
    }),
    [all],
  );
  // The agent chip names the identity the deep link scoped to, not its raw id.
  const agentName = filter.agentId
    ? (all.find((s) => s.identityId === filter.agentId)?.identityName ?? filter.agentId)
    : null;

  return (
    <div>
      <ScreenHeader
        eyebrow="Know · Intelligence"
        title="Agent Sessions"
        description="Captured AI-agent sessions. Step through prompts, tool calls, and responses; anomalies are flagged."
        actions={
          activeCount > 0 && all.length > 0 ? (
            <span className="hidden text-[length:var(--fs-small)] text-text-secondary sm:inline">
              <span className="tnum">{count(applySessionFilter(all, filter).length)}</span> of{' '}
              <span className="tnum">{count(all.length)}</span>
            </span>
          ) : undefined
        }
      />

      <QueryBoundary
        query={query}
        loadingFallback={<Card><SkeletonTableRows rows={8} cols={3} /></Card>}
        isEmpty={(d) => d.length === 0}
        empty={
          <Card>
            <EmptyState
              icon={<Sparkles className="h-5 w-5" />}
              headline="No sessions captured yet"
              guidance="As AI agents act, their sessions will appear here for review."
            />
          </Card>
        }
      >
        {(sessions) => {
          const filtered = applySessionFilter(sessions, filter);
          const open = filtered.filter((s) => s.reviewState === 'open');
          const reviewed = filtered.filter((s) => s.reviewState === 'reviewed');
          const buckets = bucketByTime(open, (s) => s.startedAt);
          const virtualize = open.length > VIRTUALIZE_THRESHOLD;

          return (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <div className="w-full sm:w-64">
                  <DebouncedSearch
                    label="Search agent sessions"
                    placeholder="Search by agent…"
                    value={filter.search}
                    onChange={setSearch}
                  />
                </div>
                <FilterPill
                  label="All"
                  count={sessions.length}
                  selected={activeCount === 0}
                  onClick={clearAll}
                />
                <FilterPill
                  label="Open"
                  count={counts.open}
                  selected={filter.review === 'open'}
                  onClick={() => setReview(filter.review === 'open' ? null : 'open')}
                />
                <FilterPill
                  label="Reviewed"
                  count={counts.reviewed}
                  selected={filter.review === 'reviewed'}
                  onClick={() => setReview(filter.review === 'reviewed' ? null : 'reviewed')}
                />
                <FilterPill
                  label="Anomalies"
                  count={counts.anomalous}
                  selected={filter.anomaliesOnly}
                  onClick={toggleAnomalies}
                  icon={<TriangleAlert className="h-3.5 w-3.5" aria-hidden="true" />}
                />
                {/* Only while scoped — this facet is set by arriving from an agent, not
                    chosen here, so an always-present chip would advertise a dead control. */}
                {agentName && (
                  <FilterPill
                    label={
                      <span className="inline-flex items-center gap-1.5">
                        {agentName}
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                      </span>
                    }
                    selected
                    onClick={clearAgent}
                  />
                )}
              </div>

              <Card>
                {filtered.length === 0 ? (
                  <EmptyState
                    icon={<FilterX className="h-5 w-5" />}
                    headline="No sessions match these filters"
                    guidance="Try removing a filter or clearing the search."
                    action={
                      <Button variant="secondary" onClick={clearAll}>
                        Clear filters
                      </Button>
                    }
                  />
                ) : (
                  <div>
                    {virtualize ? (
                      <VirtualSessionList sessions={[...open].sort(byRisk)} onOpen={openSession} />
                    ) : (
                      buckets.map((bucket) => (
                        <section key={bucket.label} aria-label={bucket.label}>
                          <h2 className="eyebrow sticky top-0 z-[var(--z-raised)] flex items-center justify-between border-b border-border bg-surface px-4 py-2">
                            <span>{bucket.label}</span>
                            <span className="tnum text-text-tertiary">{bucket.items.length}</span>
                          </h2>
                          <PlainSessionList
                            sessions={[...bucket.items].sort(byRisk)}
                            onOpen={openSession}
                            label={`${bucket.label} sessions`}
                          />
                        </section>
                      ))
                    )}
                    {open.length === 0 && (
                      <p className="px-4 py-3 text-[length:var(--fs-small)] text-text-secondary">
                        No open sessions — all reviewed below.
                      </p>
                    )}
                    <ReviewedSection sessions={reviewed} onOpen={openSession} />
                  </div>
                )}
              </Card>
            </div>
          );
        }}
      </QueryBoundary>
    </div>
  );
}
