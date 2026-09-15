import { UserRound } from 'lucide-react';
import type { ApprovalWithContext } from '@/mocks/api';
import { DebouncedSearch } from '@/components/ui/DebouncedSearch';
import { FilterMenu } from '@/components/ui/FilterMenu';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import {
  APPROVAL_VIEWS,
  APPROVAL_VIEW_LABELS,
  type ApprovalView,
  type useApprovalFilters,
} from './useApprovalFilters';

type Filters = ReturnType<typeof useApprovalFilters>;

export function ApprovalsToolbar({
  filters,
  rows,
}: {
  filters: Filters;
  rows: ApprovalWithContext[];
}) {
  const { filter } = filters;

  // Counted over the whole permitted set, never the post-filter one: they answer
  // "how many has this person raised", so they hold still while you narrow.
  const counts = new Map<string, { label: string; count: number }>();
  for (const row of rows) {
    const seen = counts.get(row.requestedBy);
    if (seen) seen.count += 1;
    else counts.set(row.requestedBy, { label: row.requesterName, count: 1 });
  }

  const requesterOptions = [...counts.entries()]
    .map(([value, { label, count }]) => ({ value, label, count }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return (
    <div className="flex flex-wrap items-center gap-2">
      <SegmentedControl<ApprovalView>
        ariaLabel="Which requests to show"
        size="sm"
        value={filter.view}
        onChange={filters.setView}
        options={APPROVAL_VIEWS.map((v) => ({ value: v, label: APPROVAL_VIEW_LABELS[v] }))}
      />
      <div className="min-w-64 flex-1">
        <DebouncedSearch
          label="Search approval requests"
          placeholder="Identity or requester…"
          value={filter.search}
          onChange={filters.setSearch}
        />
      </div>
      {/* A menu of one can never narrow anything — which is exactly what an
          Analyst sees, since the only decided rows they may read are their own. */}
      {requesterOptions.length > 1 && (
        <FilterMenu
          label="Requester"
          icon={<UserRound className="h-3.5 w-3.5" />}
          options={requesterOptions}
          selected={filter.requesters}
          onToggle={filters.toggleRequester}
          onClear={filters.clearRequesters}
        />
      )}
    </div>
  );
}
