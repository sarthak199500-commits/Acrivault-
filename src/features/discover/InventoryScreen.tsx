import { useCallback, useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { Activity, AlertTriangle, Boxes, Download, RefreshCw, ShieldAlert, X, FilterX } from 'lucide-react';
import { useInventory, useRequestRotations } from './queries';
import { useOverview } from '@/features/dashboard/queries';
import { useInventoryFilters } from './useInventoryFilters';
import { InventoryFilters } from './InventoryFilters';
import { InventoryGraph } from './InventoryGraph';
import { IdentityTable } from './IdentityTable';
import type { IdentityListResult } from '@/mocks/api';
import { useUiStore } from '@/stores/ui';
import { useCan } from '@/components/ui/Can';
import { RoleRestricted } from '@/components/ui/RoleRestricted';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { KpiTile } from '@/components/ui/KpiTile';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button, buttonClasses } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { QueryBoundary } from '@/components/ui/QueryBoundary';
import { SkeletonTableRows } from '@/components/ui/Skeleton';
import { count, pluralize } from '@/lib/format';
import { NHI_TYPE_LABELS } from '@/mocks/types';
import { bandMeta } from '@/lib/risk';
import { PROVIDER_LABEL } from '@/components/ui/ProviderBadge';
import { toast } from '@/stores/toast';
import { errorInfo } from '@/lib/apiError';
import { announce } from '@/lib/a11y';

/**
 * Whole-population KPIs for the inventory. Numbers come from the shared overview
 * (same dataset), so they reconcile with the dashboard and table.
 * // ASSUMPTION: the deltas ("this week", "pts") and "Last scan" are synthetic
 * display values; trend history and scan scheduling are upstream.
 */
function InventoryKpis() {
  const overview = useOverview();
  if (overview.isPending) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[var(--size-kpi-tile)]" />
        ))}
      </div>
    );
  }
  if (overview.isError || !overview.data) return null;
  const d = overview.data;
  const highRisk = d.riskBreakdown.critical + d.riskBreakdown.high;
  const driftPct = d.total > 0 ? (d.governanceDrift / d.total) * 100 : 0;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <KpiTile label="Total identities" value={d.total} to="/discover" icon={<Boxes className="h-4 w-4" />} />
      <KpiTile
        label="High-risk"
        value={highRisk}
        to="/discover?band=critical,high"
        icon={<AlertTriangle className="h-4 w-4" />}
        delta={18}
        deltaLabel="this week"
        deltaInverted
      />
      <KpiTile
        label="Privilege drift"
        value={`${driftPct.toFixed(1)}%`}
        to="/discover?gov=drift"
        icon={<Activity className="h-4 w-4" />}
        delta={-0.8}
        deltaLabel="pts"
        deltaInverted
      />
      <KpiTile label="Last scan" value="6 min ago" icon={<RefreshCw className="h-4 w-4" />} />
    </div>
  );
}

function BulkBar({
  selected,
  onClear,
}: {
  selected: Set<string>;
  onClear: () => void;
}) {
  const canRotate = useCan('rotate.request');
  const canExport = useCan('export');
  const n = selected.size;
  const rotate = useRequestRotations();

  const requestRotation = () => {
    rotate.mutate([...selected], {
      onSuccess: () => {
        toast(`Rotation requested for ${count(n)} ${n === 1 ? 'identity' : 'identities'}`, {
          description: 'Queued — track progress on the Rotate screen.',
          tone: 'success',
        });
        onClear();
      },
      onError: (err) => toast(errorInfo(err).message, { tone: 'critical' }),
    });
  };
  const exportSelected = () => {
    toast(`Exported ${count(n)} ${n === 1 ? 'identity' : 'identities'}`, { description: 'Synthetic CSV export.' });
  };

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-[var(--r-md)] border border-border-strong bg-surface-2 px-3 py-2">
      <span className="tnum text-[length:var(--fs-small)] font-medium text-text">
        {count(n)} selected
      </span>
      <span className="text-text-tertiary" aria-hidden="true">·</span>
      {canRotate || canExport ? (
        <div className="flex items-center gap-2">
          {canRotate && (
            <Button size="sm" variant="secondary" leadingIcon={<RefreshCw className="h-3.5 w-3.5" />} loading={rotate.isPending} onClick={requestRotation}>
              Request rotation
            </Button>
          )}
          {canExport && (
            <Button size="sm" variant="ghost" leadingIcon={<Download className="h-3.5 w-3.5" />} onClick={exportSelected}>
              Export
            </Button>
          )}
        </div>
      ) : (
        <RoleRestricted inline note="Your role can review but not act on the selection." />
      )}
      <button
        type="button"
        onClick={onClear}
        className="ml-auto inline-flex items-center gap-1 text-[length:var(--fs-small)] text-text-secondary hover:text-text"
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" /> Clear
      </button>
    </div>
  );
}

export function InventoryScreen() {
  const filters = useInventoryFilters();
  const query = useInventory(filters.filter, filters.sort);
  const overview = useOverview();
  const density = useUiStore((s) => s.density);
  const navigate = useNavigate();
  const location = useLocation();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const openDetail = useCallback(
    (id: string) => navigate({ pathname: `/discover/${id}`, search: location.search }),
    [navigate, location.search],
  );

  const data = query.data as IdentityListResult | undefined;

  // Keep the selection meaningful under filtering: drop ids that fall out of the
  // visible result set so "N selected" always matches rows the user can act on.
  useEffect(() => {
    if (!data) return;
    setSelected((prev) => {
      if (prev.size === 0) return prev;
      const visible = new Set(data.rows.map((r) => r.id));
      const next = new Set([...prev].filter((id) => visible.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [data]);

  // Filter-aware summary for the header count, e.g. "247 of 1,500 · filtered by Critical".
  const f = filters.filter;
  const activeLabels: string[] = [
    ...(f.types ?? []).map((t) => NHI_TYPE_LABELS[t]),
    ...(f.bands ?? []).map((b) => bandMeta(b).label),
    ...(f.clouds ?? []).map((c) => PROVIDER_LABEL[c]),
    ...(f.orphanedOnly ? ['Orphaned'] : []),
    ...(f.conflictsOnly ? ['Conflicts'] : []),
    ...(f.search ? [`“${f.search}”`] : []),
  ];
  const filterSummary =
    activeLabels.slice(0, 2).join(', ') + (activeLabels.length > 2 ? ` +${activeLabels.length - 2}` : '');
  const grandTotal = overview.data?.total ?? data?.total ?? 0;

  const toggleAll = useCallback(() => {
    if (!data) return;
    setSelected((prev) => {
      const allSelected = data.rows.length > 0 && data.rows.every((r) => prev.has(r.id));
      if (allSelected) return new Set();
      const next = new Set(prev);
      data.rows.forEach((r) => next.add(r.id));
      announce(`Selected ${pluralize(data.rows.length, 'row')}`);
      return next;
    });
  }, [data]);

  return (
    <div>
      <ScreenHeader
        eyebrow="See · Discover"
        title="Identity Inventory"
        description="Every correlated non-human identity. Filter, sort, and expand a row to inspect its source instances."
        actions={
          data ? (
            <span className="hidden text-[length:var(--fs-small)] text-text-secondary sm:inline">
              {filters.activeCount > 0 ? (
                <>
                  <span className="tnum">{count(data.total)}</span> of <span className="tnum">{count(grandTotal)}</span>
                  {filterSummary && <span className="text-text-tertiary"> · filtered by {filterSummary}</span>}
                </>
              ) : (
                <span className="tnum">{pluralize(data.total, 'identity', 'identities')}</span>
              )}
            </span>
          ) : undefined
        }
      />

      <div className="mb-4">
        <InventoryKpis />
      </div>

      <div className="space-y-3">
        <InventoryFilters filters={filters} counts={data?.counts} />

        {selected.size > 0 && filters.view === 'table' && (
          <BulkBar selected={selected} onClear={() => setSelected(new Set())} />
        )}

        <QueryBoundary
          query={query}
          loadingFallback={
            <Card>
              <SkeletonTableRows rows={12} cols={7} />
            </Card>
          }
          isEmpty={(d) => d.total === 0 && filters.activeCount === 0}
          empty={
            <Card>
              <EmptyState
                icon={<ShieldAlert className="h-5 w-5" />}
                headline="No identities discovered yet"
                guidance="Connect a cloud to begin discovery."
                action={
                  <Link to="/onboarding" className={buttonClasses('primary', 'md')}>
                    Start onboarding
                  </Link>
                }
              />
            </Card>
          }
        >
          {(d) =>
            d.rows.length === 0 ? (
              <Card>
                <EmptyState
                  icon={<FilterX className="h-5 w-5" />}
                  headline="No identities match these filters"
                  guidance="Try removing a filter or clearing the search."
                  action={
                    <Button variant="secondary" onClick={filters.clearAll}>
                      Clear filters
                    </Button>
                  }
                />
              </Card>
            ) : filters.view === 'graph' ? (
              <InventoryGraph counts={d.counts} />
            ) : (
              <IdentityTable
                rows={d.rows}
                sort={filters.sort}
                onSort={filters.setSort}
                selected={selected}
                onToggleSelect={toggleSelect}
                onToggleAll={toggleAll}
                onOpen={openDetail}
                density={density}
              />
            )
          }
        </QueryBoundary>
      </div>

      {/* Identity Detail renders here as a right-side panel overlay. */}
      <Outlet />
    </div>
  );
}
