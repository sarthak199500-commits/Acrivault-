import { useEffect, useMemo, useState } from 'react';
import { Download, Lock, ScrollText, Search } from 'lucide-react';
import { useAudit } from './queries';
import {
  AUDIT_OBJECTS,
  AUDIT_OBJECT_LABELS,
  AUDIT_RETENTION_LABEL,
  type AuditEntry,
  type AuditObject,
} from '@/mocks/types';
import { getDataset } from '@/mocks/dataset';
import { screenHeaderProps } from '@/app/nav';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { FilterMenu } from '@/components/ui/FilterMenu';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { QueryBoundary } from '@/components/ui/QueryBoundary';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonTableRows } from '@/components/ui/Skeleton';
import { ScrollableTable } from '@/components/ui/ScrollableTable';
import { useCan } from '@/components/ui/Can';
import { toast } from '@/stores/toast';
import { count, dateTime } from '@/lib/format';
import { downloadFile, fileStamp, tenantLabel, toCsv, utcStamp } from '@/lib/csv';
import { useActorEmail } from '@/lib/user';

/**
 * Relative windows rather than a date picker: every question an auditor brings
 * to this screen is "what happened recently", and two absolute dates are four
 * more chances to typo a bound. `days: 0` is the unbounded case.
 */
const RANGES: ReadonlyArray<{ value: string; label: string; days: number }> = [
  { value: 'all', label: 'All time', days: 0 },
  { value: '7', label: 'Last 7 days', days: 7 },
  { value: '30', label: 'Last 30 days', days: 30 },
  { value: '90', label: 'Last 90 days', days: 90 },
];

export function AuditScreen() {
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [objects, setObjects] = useState<AuditObject[]>([]);
  const [range, setRange] = useState('all');

  const days = RANGES.find((r) => r.value === range)?.days ?? 0;
  // Recomputed on every render would give the query a new `from` each time and
  // refetch forever, so the bound is pinned to the chosen window.
  const from = useMemo(
    () => (days > 0 ? new Date(Date.now() - days * 86400000).toISOString() : undefined),
    [days],
  );

  const query = useAudit({ search: search || undefined, objects, from });
  // The unfiltered log, for the per-object counts and for the honest "N of M"
  // in the header and the export manifest. Same in-memory dataset, so this is
  // a second read of already-resident data rather than a second round trip.
  const population = useAudit();

  // The Auditor exports the log as their evidence package; Analyst and Security
  // Admin read it without exporting (spec §4, Audit Log row).
  const canExport = useCan('audit.export');
  const actorEmail = useActorEmail();

  const filtered = objects.length > 0 || days > 0 || search.length > 0;
  const exportable = query.data?.length ?? 0;
  const total = population.data?.length ?? 0;

  // Counts against the whole log, not the filtered view: a menu that renumbered
  // itself as you ticked boxes could not tell you what else is in there.
  const objectCounts = useMemo(() => {
    const rows = population.data ?? [];
    return AUDIT_OBJECTS.map((o) => ({
      value: o,
      label: AUDIT_OBJECT_LABELS[o],
      count: rows.filter((e) => e.object === o).length,
    }));
  }, [population.data]);

  // Debounce the search into the query.
  useEffect(() => {
    const t = setTimeout(() => setSearch(input), 200);
    return () => clearTimeout(t);
  }, [input]);

  /** What the export was narrowed by, in a form that still means something in a
   *  spreadsheet six weeks later. */
  const filterSummary = [
    search ? `search="${search}"` : null,
    objects.length > 0 ? `object=${objects.join('|')}` : null,
    days > 0 ? `last ${days} days` : null,
  ]
    .filter(Boolean)
    .join(', ');

  const exportLog = () => {
    const entries = query.data ?? [];
    const at = new Date();
    const csv = toCsv(
      ['at_utc', 'actor', 'object', 'action', 'target', 'detail'],
      entries.map((e) => [e.at, e.actor, e.object, e.action, e.target, e.detail ?? '']),
      {
        tenant: tenantLabel(getDataset().tenant.name),
        actor: actorEmail,
        generatedAt: utcStamp(at),
        filter: filterSummary || undefined,
        rows: entries.length,
        // Stated only when this is a subset, so the reader can tell a partial
        // extract from the whole log without asking.
        of: filtered ? total : undefined,
      },
    );
    downloadFile(`acrivault-audit-${fileStamp(at)}.csv`, csv);
    toast(`Exported ${count(entries.length)} audit ${entries.length === 1 ? 'entry' : 'entries'}`, {
      description: filterSummary ? `CSV downloaded — filtered by ${filterSummary}.` : 'CSV downloaded.',
    });
  };

  return (
    <div>
      <ScreenHeader
        {...screenHeaderProps('/audit')}
        description="An append-only record of who did what and when. Everyone can read it; no one can edit it."
        actions={
          <div className="flex items-center gap-2">
            <Badge tone="neutral" icon={<Lock className="h-3 w-3" />}>Immutable</Badge>
            {canExport && (
              <Button
                size="sm"
                variant="secondary"
                leadingIcon={<Download className="h-4 w-4" />}
                disabled={exportable === 0}
                onClick={exportLog}
              >
                Export
              </Button>
            )}
          </div>
        }
      />

      <Banner tone="info" className="mb-4">
        This log is append-only. Entries are never modified or deleted — auditors depend on it.
        Retained <span className="font-medium">{AUDIT_RETENTION_LABEL}</span>, then archived to cold
        storage.
      </Banner>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="min-w-64 flex-1">
          <Input
            label="Search audit"
            hideLabel
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Search actor, action, target, or detail…"
            prefix={<Search className="h-4 w-4" />}
          />
        </div>
        <FilterMenu
          label="Object"
          options={objectCounts}
          selected={objects}
          onToggle={(v) =>
            setObjects((prev) =>
              prev.includes(v as AuditObject)
                ? prev.filter((o) => o !== v)
                : [...prev, v as AuditObject],
            )
          }
          onClear={() => setObjects([])}
        />
        <Select
          value={range}
          onValueChange={setRange}
          options={RANGES.map((r) => ({ value: r.value, label: r.label }))}
          ariaLabel="Date range"
          size="sm"
        />
      </div>

      <QueryBoundary
        query={query}
        loadingFallback={<Card><SkeletonTableRows rows={10} cols={5} /></Card>}
        isEmpty={(d) => d.length === 0}
        empty={
          <Card>
            <EmptyState
              icon={<ScrollText className="h-5 w-5" />}
              headline="No matching audit entries"
              guidance="Try a different search term, another object, or a wider date range."
            />
          </Card>
        }
      >
        {(entries: AuditEntry[]) => (
          <Card>
            <CardHeader
              title={
                filtered
                  ? `${count(entries.length)} of ${count(total)} entries`
                  : `${count(entries.length)} entries`
              }
              description={filterSummary || undefined}
            />
            <ScrollableTable label="Audit entries">
              <table className="w-full text-left text-[length:var(--fs-small)]">
                <thead>
                  <tr className="border-y border-border text-text-tertiary">
                    <th scope="col" className="px-4 py-2 font-medium">When</th>
                    <th scope="col" className="px-4 py-2 font-medium">Actor</th>
                    <th scope="col" className="px-4 py-2 font-medium">Object</th>
                    <th scope="col" className="px-4 py-2 font-medium">Action</th>
                    <th scope="col" className="px-4 py-2 font-medium">Target</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e) => (
                    <tr key={e.id} className="border-b border-border last:border-b-0 align-top">
                      <td className="tnum whitespace-nowrap px-4 py-2 text-text-secondary">{dateTime(e.at)}</td>
                      <td className="whitespace-nowrap px-4 py-2 font-mono text-text-tertiary">{e.actor}</td>
                      <td className="whitespace-nowrap px-4 py-2 text-text-secondary">
                        {AUDIT_OBJECT_LABELS[e.object]}
                      </td>
                      <td className="px-4 py-2 text-text">{e.action}</td>
                      <td className="px-4 py-2 font-mono text-text-tertiary">{e.target}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollableTable>
          </Card>
        )}
      </QueryBoundary>
    </div>
  );
}
