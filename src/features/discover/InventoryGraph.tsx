import { NHI_TYPE_LABELS, NHI_TYPES, CLOUDS, type NhiType } from '@/mocks/types';
import type { IdentityFacetCounts } from '@/mocks/api';
import { RISK_BAND_ORDER, bandMeta } from '@/lib/risk';
import { PROVIDER_LABEL } from '@/components/ui/ProviderBadge';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { BarChart } from '@/components/charts/BarChart';

/**
 * The Inventory "Graph" view: compact distribution charts over the same facet
 * counts that drive the filters, so the numbers reconcile with the table view.
 */
export function InventoryGraph({ counts }: { counts: IdentityFacetCounts }) {
  const byType = NHI_TYPES.map((t: NhiType) => ({ label: NHI_TYPE_LABELS[t], count: counts.byType[t] }));
  const byProvider = CLOUDS.map((c) => ({ label: PROVIDER_LABEL[c], count: counts.byCloud[c] }));
  const byRisk = RISK_BAND_ORDER.map((b) => ({ label: bandMeta(b).label, count: counts.byBand[b] }));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="lg:col-span-2">
        <CardHeader title="By type" description="Identities per non-human identity type." />
        <CardBody>
          <BarChart data={byType} xKey="label" series={[{ key: 'count', label: 'Identities', color: 'var(--cat-1)' }]} />
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="By cloud" description="Source instances per cloud." />
        <CardBody>
          <BarChart data={byProvider} xKey="label" series={[{ key: 'count', label: 'Identities', color: 'var(--cat-2)' }]} height={200} />
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="By risk band" description="Distribution across risk bands." />
        <CardBody>
          <BarChart data={byRisk} xKey="label" series={[{ key: 'count', label: 'Identities', color: 'var(--cat-4)' }]} height={200} />
        </CardBody>
      </Card>
    </div>
  );
}
