import { X } from 'lucide-react';
import { ROLES, ROLE_LABELS } from '@/lib/permissions';
import type { User, UserStatus } from '@/mocks/types';
import { DebouncedSearch } from '@/components/ui/DebouncedSearch';
import { FilterMenu } from '@/components/ui/FilterMenu';
import { StatusDot, type DotTone } from '@/components/ui/StatusDot';
import type { RoleFilter, useUsersFilters } from './useUsersFilters';

type Filters = ReturnType<typeof useUsersFilters>;

// Curated display order for the Status filter; only statuses actually present in
// the population are shown. Labels and dot tones echo StatusBadge.
const STATUS_ORDER: UserStatus[] = ['active', 'suspended', 'suspended-idp', 'deleted'];
const STATUS_LABELS: Record<UserStatus, string> = {
  active: 'Active',
  suspended: 'Suspended',
  'suspended-idp': 'Suspended in Entra',
  deleted: 'Deleted',
};
const STATUS_TONE: Record<UserStatus, DotTone> = {
  active: 'ok',
  suspended: 'warn',
  'suspended-idp': 'neutral',
  deleted: 'neutral',
};

export function UsersToolbar({ filters, users }: { filters: Filters; users: User[] }) {
  const { filter } = filters;

  // Facet counts over the whole population (stable, not affected by other
  // active filters) — they tell you how many of each exist.
  const roleCounts: Partial<Record<RoleFilter, number>> = {};
  const statusCounts: Partial<Record<UserStatus, number>> = {};
  for (const u of users) {
    const key: RoleFilter = u.role ?? 'none';
    roleCounts[key] = (roleCounts[key] ?? 0) + 1;
    statusCounts[u.status] = (statusCounts[u.status] ?? 0) + 1;
  }

  // "Needs role" leads the list: it is the only entry that represents work to do.
  const roleOptions = [
    ...(roleCounts.none ? [{ value: 'none', label: 'Needs role', count: roleCounts.none }] : []),
    ...ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r], count: roleCounts[r] ?? 0 })),
  ];

  const statusOptions = STATUS_ORDER.filter((s) => statusCounts[s] !== undefined).map((s) => ({
    value: s,
    label: STATUS_LABELS[s],
    count: statusCounts[s],
    swatch: <StatusDot tone={STATUS_TONE[s]} />,
  }));

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="min-w-64 flex-1">
        <DebouncedSearch
          label="Search users"
          placeholder="Search by name or email…"
          value={filter.search}
          onChange={filters.setSearch}
        />
      </div>

      <FilterMenu
        label="Role"
        options={roleOptions}
        selected={filter.roles}
        onToggle={(v) => filters.toggleRole(v as RoleFilter)}
        onClear={() => filter.roles.forEach((r) => filters.toggleRole(r))}
      />
      <FilterMenu
        label="Status"
        options={statusOptions}
        selected={filter.statuses}
        onToggle={(v) => filters.toggleStatus(v as UserStatus)}
        onClear={() => filter.statuses.forEach((s) => filters.toggleStatus(s))}
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
