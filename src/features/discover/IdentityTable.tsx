/*
 * The inventory is an ARIA treegrid (role=treegrid/row/gridcell) with a roving
 * tabindex and keyboard handling on the grid container. jsx-a11y's static
 * heuristics can't model composite widget patterns, so its click/keyboard/tabindex
 * rules are disabled for this file. Accessibility is verified by the axe pass
 * (0 violations) and the implemented keyboard nav (arrows / Enter / Space / Home / End).
 */
/* eslint-disable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex, jsx-a11y/click-events-have-key-events */
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import {
  ChevronDown,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  ChevronsUpDown,
  Unlink,
  GitCompareArrows,
} from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  CLOUD_LABELS,
  IDENTITY_STATUS_LABELS,
  NHI_TYPE_LABELS,
  type Identity,
  type SourceInstance,
} from '@/mocks/types';
import type { IdentitySort } from '@/mocks/api';
import { NOW } from '@/mocks/dataset';
import { cn } from '@/lib/cn';
import { relativeDays } from '@/lib/format';
import { announce } from '@/lib/a11y';
import { RiskPill } from '@/components/ui/RiskPill';
import { StatusDot } from '@/components/ui/StatusDot';
import { STATUS_TONE } from '@/lib/tones';
import { Checkbox } from '@/components/ui/Checkbox';
import { NhiTypeIcon } from '@/components/ui/NhiTypeIcon';
import { ProviderBadge } from '@/components/ui/ProviderBadge';
import { Tooltip } from '@/components/ui/Tooltip';

const GRID = 'minmax(40px,40px) minmax(220px,2.2fr) minmax(150px,1.1fr) minmax(112px,0.9fr) minmax(120px,1fr) minmax(130px,1fr) minmax(130px,1fr) minmax(110px,0.9fr)';

type SortCol = IdentitySort['id'];

interface HeaderCol {
  id: SortCol | 'select' | 'sources' | 'status';
  label: string;
  sortable: boolean;
}
const COLUMNS: HeaderCol[] = [
  { id: 'select', label: '', sortable: false },
  { id: 'name', label: 'Identity', sortable: true },
  { id: 'type', label: 'Type', sortable: true },
  // "Source", not "Cloud": the cell answers which source instance(s) an identity
  // was correlated from, matching this column's own `sources` id, the detail
  // panel's "Correlated sources" section, and the dashboard's "source instances".
  { id: 'sources', label: 'Source', sortable: false },
  { id: 'risk', label: 'Risk', sortable: true },
  { id: 'status', label: 'Status', sortable: false },
  { id: 'owner', label: 'Owner', sortable: true },
  { id: 'lastSeen', label: 'Last seen', sortable: true },
];

function SourceDetail({ identity }: { identity: Identity }) {
  return (
    <div className="border-t border-border bg-surface-2/60 px-4 py-3 pl-12">
      <div className="mb-2 eyebrow">Correlated sources · each authoritative for its own attributes</div>
      <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
        {identity.sources.map((source) => (
          <div key={source.externalId} className="rounded-[var(--r-md)] border border-border bg-surface p-2.5">
            <div className="mb-1.5 flex items-center justify-between">
              <ProviderBadge cloud={source.cloud} />
              <span className="text-[length:var(--fs-micro)] text-text-tertiary">
                seen {relativeDays(source.lastSeen, NOW)}
              </span>
            </div>
            <dl className="space-y-0.5">
              {Object.entries(source.attributes).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3 text-[length:var(--fs-micro)]">
                  <dt className="text-text-tertiary">{k}</dt>
                  <dd className="truncate font-mono text-text-secondary" title={v}>{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
      {identity.conflicts.length > 0 && (
        <div className="mt-2 rounded-[var(--r-md)] border border-[color-mix(in_srgb,var(--warning)_45%,var(--border))] bg-warn-bg/40 p-2.5">
          <div className="mb-1 inline-flex items-center gap-1.5 text-[length:var(--fs-small)] font-medium text-warn-fg">
            <GitCompareArrows className="h-3.5 w-3.5" aria-hidden="true" /> Attribute conflict — surfaced, never merged
          </div>
          {identity.conflicts.map((c) => (
            <div key={c.attribute} className="text-[length:var(--fs-micro)] text-text-secondary">
              <span className="text-text-tertiary">{c.attribute}:</span>{' '}
              {c.values.map((v) => `${CLOUD_LABELS[v.cloud]}=${v.value}`).join('  ·  ')}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * The cloud cell on a single line, whatever the source count.
 *
 * This cell previously rendered one ProviderBadge per source in a `flex-wrap`
 * container, so a 2- or 3-cloud identity grew the row to 2-3x the height of a
 * single-cloud one. Since correlated multi-cloud identities are the interesting
 * ones, the ragged rows clustered exactly where the eye needs to scan, and broke
 * the virtualiser's uniform row-height assumption.
 *
 * Now: the first cloud as a badge, plus a "+N" affordance carrying the rest. The
 * full list is in the tooltip AND in the badge's accessible name, so the extra
 * clouds are never hover-only — and expanding the row still lists every source in
 * full, which remains the primary way to read them.
 */
function CloudCell({ sources }: { sources: SourceInstance[] }) {
  const [first, ...rest] = sources;
  if (!first) return null;
  const restLabels = rest.map((s) => CLOUD_LABELS[s.cloud]);
  const allLabels = [CLOUD_LABELS[first.cloud], ...restLabels].join(', ');

  return (
    <span className="flex min-w-0 items-center gap-1 whitespace-nowrap">
      <ProviderBadge cloud={first.cloud} />
      {rest.length > 0 && (
        <Tooltip content={`Correlated across ${allLabels}`}>
          <span
            // Focusable so keyboard and touch users can reach the same detail.
            tabIndex={0}
            aria-label={`and ${rest.length} more: ${restLabels.join(', ')}`}
            className="tnum shrink-0 cursor-default rounded-[var(--r-xs)] border border-border bg-surface-2 px-1 text-[length:var(--fs-micro)] text-text-tertiary hover:text-text-secondary"
          >
            +{rest.length}
          </span>
        </Tooltip>
      )}
    </span>
  );
}

export function IdentityTable({
  rows,
  sort,
  onSort,
  selected,
  onToggleSelect,
  onToggleAll,
  onOpen,
  density,
}: {
  rows: Identity[];
  sort: IdentitySort;
  onSort: (col: SortCol) => void;
  selected: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleAll: () => void;
  onOpen: (id: string) => void;
  density: 'compact' | 'comfortable';
}) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [focusIndex, setFocusIndex] = useState(0);

  const estimate = density === 'compact' ? 40 : 48;

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimate,
    overscan: 12,
    getItemKey: (i) => rows[i]?.id ?? i,
  });

  const toggleExpand = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const someSelected = !allSelected && rows.some((r) => selected.has(r.id));

  // Keyboard grid navigation: arrows move the focused row, Enter opens,
  // Space selects, Right/Left expand/collapse correlated rows.
  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (rows.length === 0) return;
      const row = rows[focusIndex];
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setFocusIndex((i) => Math.min(rows.length - 1, i + 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setFocusIndex((i) => Math.max(0, i - 1));
          break;
        case 'Home':
          e.preventDefault();
          setFocusIndex(0);
          break;
        case 'End':
          e.preventDefault();
          setFocusIndex(rows.length - 1);
          break;
        case 'Enter':
          e.preventDefault();
          if (row) onOpen(row.id);
          break;
        case ' ':
          e.preventDefault();
          if (row) onToggleSelect(row.id);
          break;
        case 'ArrowRight':
          if (row?.correlated && !expanded.has(row.id)) {
            e.preventDefault();
            toggleExpand(row.id);
          }
          break;
        case 'ArrowLeft':
          if (row?.correlated && expanded.has(row.id)) {
            e.preventDefault();
            toggleExpand(row.id);
          }
          break;
        default:
          break;
      }
    },
    [rows, focusIndex, expanded, onOpen, onToggleSelect, toggleExpand],
  );

  // Keep the focused row scrolled into view and actually focused.
  useEffect(() => {
    if (rows.length === 0) return;
    virtualizer.scrollToIndex(focusIndex, { align: 'auto' });
    const id = requestAnimationFrame(() => {
      const el = parentRef.current?.querySelector<HTMLElement>(`[data-row-index="${focusIndex}"]`);
      el?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(id);
  }, [focusIndex, virtualizer, rows.length]);

  const items = virtualizer.getVirtualItems();
  const headerSort = useMemo(() => sort, [sort]);

  return (
    <div
      className="overflow-hidden rounded-[var(--r-lg)] border border-border bg-surface"
      role="treegrid"
      aria-label="Identity inventory"
      aria-rowcount={rows.length}
      aria-multiselectable="true"
    >
      {/* Below the grid's min track total the columns can't compress further, so
          pan the whole table (header + body together) instead of clipping cells. */}
      <div role="presentation" className="overflow-x-auto">
        <div role="presentation" className="min-w-[1092px]">
      {/* Header */}
      <div
        role="row"
        className="sticky top-0 z-[var(--z-sticky)] grid items-center gap-2 border-b border-border bg-surface-2 px-3 py-2"
        style={{ gridTemplateColumns: GRID }}
      >
        <div role="columnheader" className="flex items-center justify-center">
          <Checkbox
            checked={allSelected ? true : someSelected ? 'indeterminate' : false}
            onCheckedChange={onToggleAll}
            aria-label="Select all rows"
          />
        </div>
        {COLUMNS.slice(1).map((col) => {
          const isSorted = col.sortable && headerSort.id === col.id;
          const SortIcon = isSorted ? (headerSort.desc ? ArrowDown : ArrowUp) : ChevronsUpDown;
          return (
            <div
              key={col.id}
              role="columnheader"
              aria-sort={isSorted ? (headerSort.desc ? 'descending' : 'ascending') : col.sortable ? 'none' : undefined}
            >
              {col.sortable ? (
                <button
                  type="button"
                  onClick={() => {
                    onSort(col.id as SortCol);
                    announce(`Sorted by ${col.label}`);
                  }}
                  className={cn(
                    'inline-flex items-center gap-1 text-[length:var(--fs-small)] font-medium',
                    isSorted ? 'text-text' : 'text-text-secondary hover:text-text',
                  )}
                >
                  {col.label}
                  <SortIcon className={cn('h-3.5 w-3.5', !isSorted && 'opacity-50')} aria-hidden="true" />
                </button>
              ) : (
                <span className="text-[length:var(--fs-small)] font-medium text-text-secondary">{col.label}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Virtualized body */}
      <div
        ref={parentRef}
        role="rowgroup"
        tabIndex={0}
        onKeyDown={onKeyDown}
        className="relative h-[min(calc(100vh-340px),720px)] overflow-auto outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--accent)_35%,transparent)]"
      >
        <div role="presentation" style={{ height: virtualizer.getTotalSize(), position: 'relative', width: '100%' }}>
          {items.map((item) => {
            const identity = rows[item.index];
            if (!identity) return null;
            const isExpanded = expanded.has(identity.id);
            const isSelected = selected.has(identity.id);
            const isFocused = item.index === focusIndex;
            return (
              <div
                key={item.key}
                role="presentation"
                data-index={item.index}
                ref={virtualizer.measureElement}
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${item.start}px)` }}
              >
                <div
                  role="row"
                  data-row-index={item.index}
                  tabIndex={isFocused ? 0 : -1}
                  aria-selected={isSelected}
                  aria-expanded={identity.correlated ? isExpanded : undefined}
                  onFocus={() => setFocusIndex(item.index)}
                  onClick={(e) => {
                    // Don't open the panel when the click landed on the checkbox or expand toggle.
                    if ((e.target as HTMLElement).closest('button, a, input, [role="checkbox"]')) return;
                    onOpen(identity.id);
                  }}
                  className={cn(
                    'grid cursor-pointer items-center gap-2 border-b border-border px-3 outline-none',
                    'hover:bg-surface-hover focus-visible:bg-surface-hover focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-accent',
                    isSelected && 'bg-accent-tint/40',
                  )}
                  style={{ gridTemplateColumns: GRID, paddingBlock: 'var(--row-py)' }}
                >
                  {/* select */}
                  <div role="gridcell" className="flex items-center justify-center">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => onToggleSelect(identity.id)}
                      aria-label={`Select ${identity.name}`}
                    />
                  </div>
                  {/* name */}
                  <div role="gridcell" className="flex min-w-0 items-center gap-1.5">
                    {identity.correlated ? (
                      <button
                        type="button"
                        aria-label={isExpanded ? 'Collapse sources' : 'Expand sources'}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpand(identity.id);
                        }}
                        className="shrink-0 rounded p-0.5 text-text-tertiary hover:bg-surface-2 hover:text-text"
                      >
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                    ) : (
                      <span className="w-5 shrink-0" aria-hidden="true" />
                    )}
                    <span className="truncate font-mono text-[length:var(--fs-small)] text-text">{identity.name}</span>
                    {identity.orphaned && (
                      <Tooltip content={identity.orphanReason ?? 'Orphaned'}>
                        <span className="inline-flex shrink-0 text-[var(--crit-fg)]">
                          <Unlink className="h-3.5 w-3.5" aria-label="Orphaned" />
                        </span>
                      </Tooltip>
                    )}
                    {identity.conflicts.length > 0 && (
                      <Tooltip content={`${identity.conflicts.length} attribute conflict(s)`}>
                        <span className="inline-flex shrink-0 text-warn-fg">
                          <GitCompareArrows className="h-3.5 w-3.5" aria-label="Has conflicts" />
                        </span>
                      </Tooltip>
                    )}
                  </div>
                  {/* type */}
                  <div role="gridcell" className="flex min-w-0 items-center gap-1.5 text-[length:var(--fs-small)] text-text-secondary">
                    <NhiTypeIcon type={identity.type} className="h-4 w-4 shrink-0 text-text-tertiary" />
                    <span className="truncate">{NHI_TYPE_LABELS[identity.type]}</span>
                  </div>
                  {/* provider */}
                  <div role="gridcell" className="flex min-w-0 items-center gap-1">
                    <CloudCell sources={identity.sources} />
                  </div>
                  {/* risk */}
                  <div role="gridcell">
                    <RiskPill score={identity.riskScore} size="sm" showScore={false} />
                  </div>
                  {/* status */}
                  <div role="gridcell" className="flex min-w-0 items-center gap-1.5 text-[length:var(--fs-small)] text-text-secondary">
                    <StatusDot tone={STATUS_TONE[identity.status]} />
                    <span className="truncate">{IDENTITY_STATUS_LABELS[identity.status]}</span>
                  </div>
                  {/* owner */}
                  <div role="gridcell" className="truncate text-[length:var(--fs-small)] text-text-secondary">
                    {identity.owner ?? <span className="text-text-tertiary">—</span>}
                  </div>
                  {/* last seen */}
                  <div role="gridcell" className="tnum truncate text-[length:var(--fs-small)] text-text-tertiary">
                    {relativeDays(identity.lastSeen, NOW)}
                  </div>
                </div>
                {isExpanded && (
                  <div role="row">
                    <div role="gridcell">
                      <SourceDetail identity={identity} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
        </div>
      </div>
    </div>
  );
}
