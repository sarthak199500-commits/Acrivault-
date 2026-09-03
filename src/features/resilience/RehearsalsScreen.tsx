import { ShieldCheck, Timer } from 'lucide-react';
import { useRehearsals } from './queries';
import type { RecoveryRehearsal } from '@/mocks/types';
import { screenHeaderProps } from '@/app/nav';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Banner } from '@/components/ui/Banner';
import { QueryBoundary } from '@/components/ui/QueryBoundary';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonTableRows } from '@/components/ui/Skeleton';
import { ScrollableTable } from '@/components/ui/ScrollableTable';
import { date, duration } from '@/lib/format';

const OUTCOME_TONE: Record<RecoveryRehearsal['outcome'], BadgeTone> = {
  passed: 'success',
  partial: 'warning',
  failed: 'critical',
};

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

export function RehearsalsScreen() {
  const query = useRehearsals();

  return (
    <div>
      <ScreenHeader
        {...screenHeaderProps('/resilience/rehearsals')}
        description="How quickly the organization can get back to a usable state after a credential compromise."
        actions={<Badge tone="neutral">Concept</Badge>}
      />

      <Banner tone="info" className="mb-4">
        This is a Wave 2 concept screen. It exercises the design system and shows the surface; the recovery internals are out of scope.
      </Banner>

      <QueryBoundary
        query={query}
        loadingFallback={<Card><SkeletonTableRows rows={6} cols={4} /></Card>}
        isEmpty={(d) => d.length === 0}
        empty={<Card><EmptyState icon={<ShieldCheck className="h-5 w-5" />} headline="No rehearsals yet" guidance="Recovery rehearsals will appear here." /></Card>}
      >
        {(rehearsals: RecoveryRehearsal[]) => {
          const med = median(rehearsals.map((r) => r.timeToUsableMin));
          const passRate = Math.round((rehearsals.filter((r) => r.outcome === 'passed').length / rehearsals.length) * 100);
          return (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <Card>
                  <CardBody className="flex items-center gap-3 pt-5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-[var(--r-md)] bg-accent-tint text-accent-text"><Timer className="h-4 w-4" aria-hidden="true" /></span>
                    <div>
                      <div className="eyebrow mb-0.5">Median time-to-usable</div>
                      <div className="tnum text-[length:var(--fs-display)] font-semibold text-text">{duration(med * 60000)}</div>
                    </div>
                  </CardBody>
                </Card>
                <Card>
                  <CardBody className="pt-5">
                    <div className="eyebrow mb-0.5">Pass rate</div>
                    <div className="tnum text-[length:var(--fs-display)] font-semibold text-text">{passRate}%</div>
                  </CardBody>
                </Card>
                <Card>
                  <CardBody className="pt-5">
                    <div className="eyebrow mb-0.5">Rehearsals run</div>
                    <div className="tnum text-[length:var(--fs-display)] font-semibold text-text">{rehearsals.length}</div>
                  </CardBody>
                </Card>
              </div>

              <Card>
                <CardHeader title="Rehearsal history" />
                <ScrollableTable label="Recovery rehearsals">
                  <table className="w-full text-left text-[length:var(--fs-small)]">
                    <thead>
                      <tr className="border-y border-border text-text-tertiary">
                        <th scope="col" className="px-4 py-2 font-medium">When</th>
                        <th scope="col" className="px-4 py-2 font-medium">Scope</th>
                        <th scope="col" className="px-4 py-2 font-medium">Outcome</th>
                        <th scope="col" className="px-4 py-2 font-medium">Time to usable</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rehearsals.map((r) => (
                        <tr key={r.id} className="border-b border-border last:border-b-0">
                          <td className="tnum px-4 py-2 text-text-secondary">{date(r.at)}</td>
                          <td className="px-4 py-2 text-text">{r.scope}</td>
                          <td className="px-4 py-2"><Badge tone={OUTCOME_TONE[r.outcome]} className="capitalize">{r.outcome}</Badge></td>
                          <td className="tnum px-4 py-2 text-text-secondary">{duration(r.timeToUsableMin * 60000)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollableTable>
              </Card>
            </div>
          );
        }}
      </QueryBoundary>
    </div>
  );
}
