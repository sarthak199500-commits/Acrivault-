import { ShieldX, X } from 'lucide-react';
import { NHI_TYPES, NHI_TYPE_LABELS, type NhiType } from '@/mocks/types';
import type { QuarantinedIdentity } from '@/mocks/api';
import { DebouncedSearch } from '@/components/ui/DebouncedSearch';
import { FilterMenu } from '@/components/ui/FilterMenu';
import {
  PRODUCER_FACETS,
  PRODUCER_LABELS,
  type ProducerFacet,
  type useQuarantineFilters,
} from './useQuarantineFilters';

type Filters = ReturnType<typeof useQuarantineFilters>;

export function QuarantineToolbar({
  filters,
  rows,
}: {
  filters: Filters;
  rows: QuarantinedIdentity[];
}) {
  const { filter } = filters;

  // Facet counts over the whole contained set, never the post-filter one: they
  // answer "how many of each exist", so they hold still while you narrow.
  const typeCounts: Partial<Record<NhiType, number>> = {};
  const producerCounts: Partial<Record<ProducerFacet, number>> = {};
  for (const row of rows) {
    typeCounts[row.type] = (typeCounts[row.type] ?? 0) + 1;
    producerCounts[row.producer] = (producerCounts[row.producer] ?? 0) + 1;
  }

  // Only types actually present — an option that can only ever return nothing is
  // noise. All five happen to show up at the default seed, but type assignment
  // and quarantine selection are independent draws (see `contained` in
  // `makeIdentity`, mocks/generators.ts), so nothing guarantees a smaller
  // dataset keeps that coverage.
  const typeOptions = NHI_TYPES.filter((t) => typeCounts[t] !== undefined).map((t) => ({
    value: t,
    label: NHI_TYPE_LABELS[t],
    count: typeCounts[t],
  }));

  // Every facet always shows, including at zero: the three are the screen's whole
  // subject, and one quietly missing would read as "this cannot happen" rather
  // than "none right now".
  const producerOptions = PRODUCER_FACETS.map((p) => ({
    value: p,
    label: PRODUCER_LABELS[p],
    count: producerCounts[p] ?? 0,
  }));

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="min-w-64 flex-1">
        <DebouncedSearch
          label="Search quarantined identities"
          placeholder="Identity or who quarantined it…"
          value={filter.search}
          onChange={filters.setSearch}
        />
      </div>

      <FilterMenu
        label="Type"
        options={typeOptions}
        selected={filter.types}
        onToggle={(v) => filters.toggleType(v as NhiType)}
        onClear={filters.clearTypes}
      />
      <FilterMenu
        label="Produced by"
        icon={<ShieldX className="h-3.5 w-3.5" />}
        options={producerOptions}
        selected={filter.producers}
        onToggle={(v) => filters.toggleProducer(v as ProducerFacet)}
        onClear={filters.clearProducers}
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
  );
}
