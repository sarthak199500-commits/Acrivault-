import { useEffect, useState } from 'react';
import { Lock, ScrollText, Search } from 'lucide-react';
import { useAudit } from './queries';
import type { AuditEntry } from '@/mocks/types';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Banner } from '@/components/ui/Banner';
import { Input } from '@/components/ui/Input';
import { QueryBoundary } from '@/components/ui/QueryBoundary';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonTableRows } from '@/components/ui/Skeleton';
import { ScrollableTable } from '@/components/ui/ScrollableTable';
import { dateTime } from '@/lib/format';

export function AuditScreen() {
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const query = useAudit(search || undefined);

  // Debounce the search into the query.
  useEffect(() => {
    const t = setTimeout(() => setSearch(input), 200);
    return () => clearTimeout(t);
  }, [input]);

  return (
    <div>
      <ScreenHeader
        eyebrow="Platform"
        title="Audit Log"
        description="An append-only record of who did what and when. Everyone can read it; no one can edit it."
        actions={<Badge tone="neutral" icon={<Lock className="h-3 w-3" />}>Immutable</Badge>}
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
