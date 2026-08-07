import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, GitBranch, ShieldHalf, Timer, Workflow } from 'lucide-react';
import { useBlastOrigins, useBlastRadius } from './queries';
import type { ReachKind } from '@/components/charts/RadialGraph';
import { RadialGraph, KIND_COLOR, KIND_LABEL } from '@/components/charts/RadialGraph';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Banner } from '@/components/ui/Banner';
import { Select } from '@/components/ui/Select';
import { QueryBoundary } from '@/components/ui/QueryBoundary';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { count, pluralize } from '@/lib/format';
import { cn } from '@/lib/cn';

const FILTERABLE: ReachKind[] = ['direct', 'transitive', 'cascade'];

function ReachStat({ kind, value }: { kind: ReachKind; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-[var(--r-md)] border border-border bg-surface-2 px-3 py-2.5">
      <span className="inline-flex items-center gap-2 text-[length:var(--fs-small)] text-text-secondary">
        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: KIND_COLOR[kind] }} aria-hidden="true" />
        {KIND_LABEL[kind]} reach
      </span>
      <span className="tnum text-[length:var(--fs-h2)] font-semibold text-text">{count(value)}</span>
    </div>
  );
}

/**
 * The two Wave-2 concepts the FRS links from this screen. Both are surfaces only —
 * neither runs anything in Wave 1, so each carries its Concept badge here as well.
 */
function RelatedActions() {
  const actions = [
    { to: '/resilience/rehearsals', label: 'Rehearse recovery', icon: ShieldHalf },
    { to: '/resilience/copilot', label: 'Ask Copilot', icon: Workflow },
  ];
  return (
    <Card>
      <CardHeader title="Related actions" />
      <CardBody className="space-y-2 pt-0">
        {actions.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="flex items-center justify-between gap-2 rounded-[var(--r-md)] border border-border bg-surface-2 px-3 py-2 hover:border-border-strong"
          >
            <span className="inline-flex items-center gap-2 text-[length:var(--fs-small)] text-accent-text">
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {label}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Badge tone="neutral">Concept</Badge>
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-text-tertiary" aria-hidden="true" />
            </span>
          </Link>
        ))}
      </CardBody>
    </Card>
  );
}

export function BlastRadiusScreen() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const originParam = searchParams.get('origin');
  const origins = useBlastOrigins();
  const [originId, setOriginId] = useState<string>(originParam ?? '');
  const [visible, setVisible] = useState<Set<ReachKind>>(new Set(['origin', 'direct', 'transitive', 'cascade']));

  // A deep link (?origin=…) from an identity's detail wins over the auto-selected default.
  useEffect(() => {
    if (originParam) setOriginId(originParam);
  }, [originParam]);

  // Auto-select the first origin once the list loads. The list is ordered by reach,
  // so the default opens on a graph worth looking at rather than a near-empty one.
  useEffect(() => {
    if (!originId && origins.data && origins.data.length > 0) setOriginId(origins.data[0].id);
  }, [origins.data, originId]);

  const radius = useBlastRadius(originId || undefined);

  const originOptions = useMemo(() => {
    const opts = (origins.data ?? []).map((o) => ({
      value: o.id,
      label: `${o.name}  ·  risk ${o.riskScore}  ·  ${o.reach} direct`,
    }));
    // A deep-linked origin may sit outside the top-N picker list; surface it (with its
    // resolved name once the radius loads) so the Select shows a label, not a blank.
    if (originId && !opts.some((o) => o.value === originId)) {
      const label = radius.data?.nodes.find((n) => n.kind === 'origin')?.label ?? originId;
      return [{ value: originId, label }, ...opts];
    }
    return opts;
  }, [origins.data, originId, radius.data]);

  const toggleKind = (k: ReachKind) =>
    setVisible((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  return (
    <div>
      <ScreenHeader
        eyebrow="Know · Resilience"
        title="Blast Radius"
        description="What an identity could reach by direct, transitive, and cascade paths. Read-only — this view counts and visualizes; it never changes anything."
        actions={<Badge tone="neutral">Read-only</Badge>}
      />

      <div className="mb-4 max-w-md">
        {origins.isPending ? (
          <Skeleton className="h-9 w-full" />
        ) : (
          <Select
            value={originId}
            onValueChange={setOriginId}
            options={originOptions}
            ariaLabel="Origin identity"
            placeholder="Pick an origin identity…"
          />
        )}
      </div>

      {!originId ? (
        <Card>
          <EmptyState
            icon={<GitBranch className="h-5 w-5" />}
            headline="Pick an identity to begin"
            guidance="Choose an origin identity above to see what it could reach."
          />
        </Card>
      ) : (
        <QueryBoundary
          query={radius}
          loadingFallback={
            <div className="grid gap-4 lg:grid-cols-[1fr_var(--rail-w)]">
              <Skeleton className="h-[460px]" />
              <Skeleton className="h-[460px]" />
            </div>
          }
          isEmpty={(d) => d === null}
          empty={<Card><EmptyState headline="No reachability for this origin" guidance="Pick a different identity." /></Card>}
        >
          {(data) => {
            if (!data) return null;
            return (
              <div className="grid gap-4 lg:grid-cols-[1fr_var(--rail-w)] lg:items-start">
                <Card>
                  <CardHeader
                    title="Reachability"
                    action={
                      <div className="flex flex-wrap items-center gap-1.5">
                        {FILTERABLE.map((k) => (
                          <button
                            key={k}
                            type="button"
                            onClick={() => toggleKind(k)}
                            aria-pressed={visible.has(k)}
                            className={cn(
                              'inline-flex items-center gap-1.5 rounded-[var(--r-pill)] border px-2.5 py-1 text-[length:var(--fs-micro)] transition-colors',
                              visible.has(k) ? 'border-border-strong bg-surface-2 text-text' : 'border-border text-text-tertiary',
                            )}
                          >
                            <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: KIND_COLOR[k], opacity: visible.has(k) ? 1 : 0.4 }} aria-hidden="true" />
                            {KIND_LABEL[k]}
                          </button>
                        ))}
                      </div>
                    }
                  />
                  <CardBody>
                    <RadialGraph
                      nodes={data.nodes}
                      edges={data.edges}
                      visibleKinds={visible}
                      onSelect={(n) => navigate(`/discover/${n.identityId}`)}
                      reachTotal={data.graph.total}
                    />
                    {data.graph.drawn < data.graph.total ? (
                      <p className="mt-2 text-[length:var(--fs-micro)] text-text-tertiary">
                        Graph shows {count(data.graph.drawn)} of {count(data.graph.total)} reachable
                        identities — capped so the paths stay readable. The reach summary counts all{' '}
                        {count(data.graph.total)}.
                      </p>
                    ) : (
                      <p className="mt-2 text-[length:var(--fs-micro)] text-text-tertiary">
                        Showing the complete reachable set. Select any node to open that identity.
                      </p>
                    )}
                  </CardBody>
                </Card>

                <div className="space-y-3">
                  <ReachStat kind="direct" value={data.summary.direct} />
                  <ReachStat kind="transitive" value={data.summary.transitive} />
                  <ReachStat kind="cascade" value={data.summary.cascade} />

                  <Card>
                    <CardBody className="flex items-center gap-3 pt-5">
                      <span className="flex h-9 w-9 items-center justify-center rounded-[var(--r-md)] bg-surface-2 text-text-tertiary">
                        <Timer className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <div>
                        <div className="eyebrow mb-0.5">Estimated containment</div>
                        <div className="tnum text-[length:var(--fs-h1)] font-semibold text-text">{data.estimatedContainment}</div>
                      </div>
                    </CardBody>
                  </Card>

                  {data.summary.cascade > 0 && (
                    <Banner tone="warning">
                      {pluralize(data.summary.cascade, 'identity', 'identities')} {data.summary.cascade === 1 ? 'sits' : 'sit'} on a cascade path — compromising the origin could force {data.summary.cascade === 1 ? 'its' : 'their'} revocation or reissue.
                    </Banner>
                  )}

                  <RelatedActions />
                </div>
              </div>
            );
          }}
        </QueryBoundary>
      )}
    </div>
  );
}
