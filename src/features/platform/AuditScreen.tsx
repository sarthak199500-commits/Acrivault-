import { useEffect, useState } from 'react';
import { Download, Lock, ScrollText, Search } from 'lucide-react';
import { useAudit } from './queries';
import type { AuditEntry } from '@/mocks/types';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { QueryBoundary } from '@/components/ui/QueryBoundary';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonTableRows } from '@/components/ui/Skeleton';
import { ScrollableTable } from '@/components/ui/ScrollableTable';
import { useCan } from '@/components/ui/Can';
import { toast } from '@/stores/toast';
import { dateTime } from '@/lib/format';

export function AuditScreen() {
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const query = useAudit(search || undefined);
  // The Auditor exports the log as their evidence package; Analyst and Security
  // Admin read it without exporting (spec §4, Audit Log row).
  const canExport = useCan('audit.export');
  const exportable = query.data?.length ?? 0;

  // Debounce the search into the query.
  useEffect(() => {
    const t = setTimeout(() => setSearch(input), 200);
    return () => clearTimeout(t);
  }, [input]);

  const exportLog = () => {
    toast(`Exported ${exportable} audit ${exportable === 1 ? 'entry' : 'entries'}`, {
      description: search ? `Synthetic CSV export, filtered by "${search}".` : 'Synthetic CSV export.',
    });
  };

  return (
    <div>
      <ScreenHeader
        eyebrow="Platform"
        title="Audit Log"
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
      </Banner>

      <div className="mb-3 max-w-sm">
        <Input
          label="Search audit"
          hideLabel
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Search action or actor…"
          prefix={<Search className="h-4 w-4" />}
        />
      </div>

      <QueryBoundary
        query={query}
        loadingFallback={<Card><SkeletonTableRows rows={10} cols={4} /></Card>}
        isEmpty={(d) => d.length === 0}
        empty={<Card><EmptyState icon={<ScrollText className="h-5 w-5" />} headline="No matching audit entries" guidance="Try a different search term." /></Card>}
      >
        {(entries: AuditEntry[]) => (
          <Card>
            <CardHeader title={`${entries.length} entries`} />
            <ScrollableTable label="Audit entries">
              <table className="w-full text-left text-[length:var(--fs-small)]">
                <thead>
                  <tr className="border-y border-border text-text-tertiary">
                    <th scope="col" className="px-4 py-2 font-medium">When</th>
                    <th scope="col" className="px-4 py-2 font-medium">Actor</th>
                    <th scope="col" className="px-4 py-2 font-medium">Action</th>
                    <th scope="col" className="px-4 py-2 font-medium">Target</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e) => (
                    <tr key={e.id} className="border-b border-border last:border-b-0 align-top">
                      <td className="tnum whitespace-nowrap px-4 py-2 text-text-secondary">{dateTime(e.at)}</td>
                      <td className="whitespace-nowrap px-4 py-2 font-mono text-text-tertiary">{e.actor}</td>
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
