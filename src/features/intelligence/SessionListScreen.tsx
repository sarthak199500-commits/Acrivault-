import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, TriangleAlert } from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useSessions } from './queries';
import type { SessionStatus } from '@/mocks/types';
import type { AgentSessionWithIdentity } from '@/mocks/api';
import { riskBand } from '@/lib/risk';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { RiskPill } from '@/components/ui/RiskPill';
import { QueryBoundary } from '@/components/ui/QueryBoundary';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonTableRows } from '@/components/ui/Skeleton';
import { pluralize, relativeTime } from '@/lib/format';

const STATUS_TONE: Record<SessionStatus, BadgeTone> = {
  open: 'warning',
  reviewed: 'info',
  quarantined: 'critical',
};

// Above this row count the list virtualizes; smaller lists render plainly so
// every row stays in the tab order.
const VIRTUALIZE_THRESHOLD = 40;
const ROW_H = 64;

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
        'grid w-full grid-cols-[2rem_1fr_7rem] items-center gap-4 border-b border-l-[3px] px-4 py-3 text-left last:border-b-0 hover:bg-surface-hover ' +
        (elevated ? 'border-b-border' : 'border-l-transparent border-b-border')
      }
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--r-sm)] bg-accent-tint text-accent-text">
        <Sparkles className="h-4 w-4" aria-hidden="true" />
      </span>

      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate text-[length:var(--fs-small)] font-medium text-text">{session.identityName}</span>
          <Badge tone={STATUS_TONE[session.status]} className="shrink-0 capitalize">{session.status}</Badge>
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-[length:var(--fs-micro)] text-text-tertiary">
          <span>{relativeTime(session.startedAt)}</span>
          <span aria-hidden="true">·</span>
          <span className="tnum">{pluralize(session.steps.length, 'step')}</span>
          <span aria-hidden="true">·</span>
          <span className={'tnum inline-flex items-center gap-1 ' + (hasAnomalies ? 'text-crit-fg' : '')}>
            {hasAnomalies && <TriangleAlert className="h-3 w-3" aria-hidden="true" />}
            {pluralize(session.anomalyCount, 'anomaly', 'anomalies')}
          </span>
        </div>
      </div>

      {/* Fixed risk column — aligns across rows; RiskPill carries label + tabular score. */}
      <div className="flex justify-end">
        <RiskPill score={session.riskScore} size="sm" />
      </div>
    </button>
  );
}

function VirtualSessionList({ sessions, onOpen }: { sessions: AgentSessionWithIdentity[]; onOpen: (s: AgentSessionWithIdentity) => void }) {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: sessions.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_H,
    overscan: 10,
  });
  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scrollable region must be focusable (WCAG scrollable-region-focusable)
    <div ref={parentRef} tabIndex={0} role="list" aria-label="Agent sessions"
      style={{ height: 'calc(100vh - 16rem)' }}
      className="overflow-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--accent)_30%,transparent)]"
    >
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map((item) => {
          const session = sessions[item.index];
          return (
            <div
              key={session.id}
              role="listitem"
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

export function SessionListScreen() {
  const query = useSessions();
  const navigate = useNavigate();
  const openSession = (s: AgentSessionWithIdentity) => navigate(`/intelligence/${s.id}`);

  return (
    <div>
      <ScreenHeader
        eyebrow="Know · Intelligence"
        title="Agent Sessions"
        description="Captured AI-agent sessions. Step through prompts, tool calls, and responses; anomalies are flagged."
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
        {(sessions) => (
          <Card>
            {sessions.length > VIRTUALIZE_THRESHOLD ? (
              <VirtualSessionList sessions={sessions} onOpen={openSession} />
            ) : (
              <div role="list" aria-label="Agent sessions">
                {sessions.map((s) => (
                  <div role="listitem" key={s.id}>
                    <SessionRow session={s} onOpen={() => openSession(s)} />
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}
      </QueryBoundary>
    </div>
  );
}
