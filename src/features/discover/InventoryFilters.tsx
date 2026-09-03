import { useEffect, useState } from 'react';
import { Search, Unlink, GitCompareArrows, X, Table, Network, Cloudy } from 'lucide-react';
import { NHI_TYPES, NHI_TYPE_LABELS, CLOUDS, IDENTITY_STATUSES, IDENTITY_STATUS_LABELS, type NhiType, type IdentityStatus } from '@/mocks/types';
import type { IdentityFacetCounts } from '@/mocks/api';
import { RISK_BAND_ORDER, bandMeta } from '@/lib/risk';
import { STATUS_TONE } from '@/lib/tones';
import { FilterMenu } from '@/components/ui/FilterMenu';
import { FilterPill } from '@/components/ui/FilterPill';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Input } from '@/components/ui/Input';
import { NhiTypeIcon } from '@/components/ui/NhiTypeIcon';
import { StatusDot } from '@/components/ui/StatusDot';
import { PROVIDER_COLOR, PROVIDER_LABEL } from '@/components/ui/ProviderBadge';
import { SavedViews } from './SavedViews';
import type { useInventoryFilters } from './useInventoryFilters';

type Filters = ReturnType<typeof useInventoryFilters>;

function Dot({ color }: { color: string }) {
  return <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />;
}

function DebouncedSearch({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [local, setLocal] = useState(value);

  // Keep local input in sync if the URL changes externally (e.g. clear filters).
  useEffect(() => setLocal(value), [value]);

  // Debounce pushing to the URL so typing stays smooth at 50k rows.
  useEffect(() => {
    const t = setTimeout(() => {
      if (local !== value) onChange(local);
    }, 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local]);

  return (
    <Input
      label="Search identities"
      hideLabel
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      placeholder="Search name, owner, or source id…"
      prefix={<Search className="h-4 w-4" />}
      suffix={
        local ? (
          <button type="button" aria-label="Clear search" onClick={() => setLocal('')} className="hover:text-text">
            <X className="h-3.5 w-3.5" />
          </button>
        ) : undefined
      }
      className="max-w-none"
    />
  );
}

export function InventoryFilters({
  filters,
  counts,
}: {
  filters: Filters;
  counts: IdentityFacetCounts | undefined;
}) {
  const { filter } = filters;

  const typeOptions = NHI_TYPES.map((type: NhiType) => ({
    value: type,
    label: NHI_TYPE_LABELS[type],
    count: counts?.byType[type],
    swatch: <NhiTypeIcon type={type} className="h-3.5 w-3.5 text-text-tertiary" />,
  }));
  const providerOptions = CLOUDS.map((cloud) => ({
    value: cloud,
    label: PROVIDER_LABEL[cloud],
    count: counts?.byCloud[cloud],
    swatch: <Dot color={PROVIDER_COLOR[cloud]} />,
  }));
  const riskOptions = RISK_BAND_ORDER.map((band) => ({
    value: band,
    label: bandMeta(band).label,
    count: counts?.byBand[band],
    swatch: <Dot color={bandMeta(band).cssVar} />,
  }));
  const statusOptions = IDENTITY_STATUSES.map((s: IdentityStatus) => ({
    value: s,
    label: IDENTITY_STATUS_LABELS[s],
    count: counts?.byStatus[s],
    swatch: <StatusDot tone={STATUS_TONE[s]} />,
  }));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-72 flex-1 rounded-[var(--r-sm)] focus-within:ring-2 focus-within:ring-[color-mix(in_srgb,var(--accent)_45%,transparent)]">
          <DebouncedSearch value={filter.search ?? ''} onChange={filters.setSearch} />
        </div>

        <FilterMenu
          label="Type"
          options={typeOptions}
          selected={filter.types ?? []}
          onToggle={(v) => filters.toggleType(v as NhiType)}
          onClear={() => (filter.types ?? []).forEach((t) => filters.toggleType(t))}
        />
        <FilterMenu
          label="Source"
          options={providerOptions}
          selected={filter.clouds ?? []}
          onToggle={(v) => filters.toggleCloud(v as (typeof CLOUDS)[number])}
          onClear={() => (filter.clouds ?? []).forEach((c) => filters.toggleCloud(c))}
        />
        <FilterMenu
          label="Severity"
          options={riskOptions}
          selected={filter.bands ?? []}
          onToggle={(v) => filters.toggleBand(v as (typeof RISK_BAND_ORDER)[number])}
          onClear={() => (filter.bands ?? []).forEach((b) => filters.toggleBand(b))}
        />
        <FilterMenu
          label="Status"
          options={statusOptions}
          selected={filter.statuses ?? []}
          onToggle={(v) => filters.toggleStatus(v as IdentityStatus)}
          onClear={() => (filter.statuses ?? []).forEach((s) => filters.toggleStatus(s))}
        />

        <SavedViews
          currentFilter={filter}
          onApply={filters.applyFilter}
          hasActiveFilter={filters.activeCount > 0}
        />

        <div className="ml-auto">
          <SegmentedControl
            ariaLabel="Inventory view"
            value={filters.view}
            onChange={filters.setView}
            options={[
              { value: 'table', label: 'Table', icon: <Table className="h-3.5 w-3.5" /> },
              { value: 'graph', label: 'Graph', icon: <Network className="h-3.5 w-3.5" /> },
            ]}
          />
        </div>
      </div>

      {/* Status group + clear */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="eyebrow mr-1">Flags</span>
        <FilterPill
          label="Orphaned"
          count={counts?.orphaned}
          selected={filter.orphanedOnly ?? false}
          onClick={filters.toggleOrphaned}
          icon={<Unlink className="h-3.5 w-3.5" />}
        />
        <FilterPill
          label="Conflicts"
          count={counts?.conflicts}
          selected={filter.conflictsOnly ?? false}
          onClick={filters.toggleConflicts}
          icon={<GitCompareArrows className="h-3.5 w-3.5" />}
        />
        {/* Cross-cloud correlation is the capability competitors cannot match, so
            it sits beside the other two findings rather than staying an unused
            boolean readable only as a grey "+2" in a row. */}
        <FilterPill
          label="Cross-cloud"
          count={counts?.crossCloud}
          selected={filter.crossCloudOnly ?? false}
          onClick={filters.toggleCrossCloud}
          icon={<Cloudy className="h-3.5 w-3.5" />}
        />
        {filters.activeCount > 0 && (
          <button
            type="button"
            onClick={filters.clearAll}
            className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-[var(--r-sm)] px-2.5 text-[length:var(--fs-small)] text-text-secondary hover:bg-surface-hover hover:text-text"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            Clear ({filters.activeCount})
          </button>
        )}
      </div>
    </div>
  );
}
