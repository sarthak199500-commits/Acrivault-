import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import { ROLES, ROLE_LABELS, type Role } from '@/lib/permissions';
import type { User, UserStatus } from '@/mocks/types';
import { FilterMenu } from '@/components/ui/FilterMenu';
import { Input } from '@/components/ui/Input';
import { StatusDot, type DotTone } from '@/components/ui/StatusDot';
import type { useUsersFilters } from './useUsersFilters';

type Filters = ReturnType<typeof useUsersFilters>;

// Curated display order for the Status filter; only statuses actually present in
// the population are shown. Labels and dot tones echo StatusBadge.
const STATUS_ORDER: UserStatus[] = ['active', 'suspended', 'pending', 'invited', 'deleted'];
const STATUS_LABELS: Record<UserStatus, string> = {
  active: 'Active',
  suspended: 'Suspended',
  pending: 'Pending',
  invited: 'Invited',
  deleted: 'Deleted',
};
const STATUS_TONE: Record<UserStatus, DotTone> = {
  active: 'ok',
  suspended: 'warn',
  pending: 'neutral',
  invited: 'neutral',
  deleted: 'neutral',
};

/**
 * Debounced search field. Local state keeps typing smooth and only pushes to the
 * URL after a short pause; it re-syncs when the URL changes externally (Clear).
 */
function DebouncedSearch({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [local, setLocal] = useState(value);

  useEffect(() => setLocal(value), [value]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (local !== value) onChange(local);
    }, 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local]);

  return (
    <Input
      label="Search users"
      hideLabel
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      placeholder="Search by name or email…"
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

export function UsersToolbar({ filters, users }: { filters: Filters; users: User[] }) {
  const { filter } = filters;

  // Facet counts over the whole population (stable, not affected by other
  // active filters) — they tell you how many of each exist.
  const roleCounts: Partial<Record<Role, number>> = {};
  const statusCounts: Partial<Record<UserStatus, number>> = {};
  for (const u of users) {
    roleCounts[u.role] = (roleCounts[u.role] ?? 0) + 1;
    statusCounts[u.status] = (statusCounts[u.status] ?? 0) + 1;
  }

  const roleOptions = ROLES.map((r) => ({
    value: r,
    label: ROLE_LABELS[r],
    count: roleCounts[r] ?? 0,
  }));

  const statusOptions = STATUS_ORDER.filter((s) => statusCounts[s] !== undefined).map((s) => ({
    value: s,
    label: STATUS_LABELS[s],
    count: statusCounts[s],
    swatch: <StatusDot tone={STATUS_TONE[s]} />,
  }));

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="min-w-64 flex-1">
        <DebouncedSearch value={filter.search} onChange={filters.setSearch} />
      </div>

      <FilterMenu
        label="Role"
        options={roleOptions}
        selected={filter.roles}
        onToggle={(v) => filters.toggleRole(v as Role)}
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
