import { Link } from 'react-router-dom';
import { AlertTriangle, Cloud as CloudIcon } from 'lucide-react';
import { useConnections, useSourceHealth } from './queries';
import { CLOUD_LABELS, type CloudConnection } from '@/mocks/types';
import { screenHeaderProps } from '@/app/nav';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { StatusDot } from '@/components/ui/StatusDot';
import { Banner } from '@/components/ui/Banner';
import { QueryBoundary } from '@/components/ui/QueryBoundary';
import { SkeletonTableRows } from '@/components/ui/Skeleton';
import { buttonClasses } from '@/components/ui/Button';
import { useCan } from '@/components/ui/Can';
import { CONNECTION_TONE } from '@/lib/tones';
import { count, dateTime, relativeTime } from '@/lib/format';

function totalFor(connection: CloudConnection): number {
  return connection.counts ? Object.values(connection.counts).reduce((a, b) => a + b, 0) : 0;
}

function SourceRow({ connection }: { connection: CloudConnection }) {
  const failed = connection.status === 'error';
  return (
    <li className="rounded-[var(--r-md)] border border-border bg-surface-2">
      <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5">
        <span className="inline-flex items-center gap-2 text-[length:var(--fs-small)] text-text">
          <StatusDot tone={CONNECTION_TONE[connection.status]} />
          {CLOUD_LABELS[connection.cloud]}
        </span>
        <span className="flex items-center gap-4 text-[length:var(--fs-small)]">
          <span className="tnum text-text-tertiary">
            {count(totalFor(connection))} source instances
          </span>
          <span className={failed ? 'text-crit-fg' : 'text-text-tertiary'}>
            {connection.lastSyncAt ? (
              <>
                {failed ? 'last success ' : 'synced '}
                <span className="tnum" title={dateTime(connection.lastSyncAt)}>
                  {relativeTime(connection.lastSyncAt)}
                </span>
              </>
            ) : (
              'never synced'
            )}
          </span>
        </span>
      </div>
      {connection.error && (
        <div className="border-t border-[color-mix(in_srgb,var(--critical)_35%,var(--border))] bg-crit-bg px-3 py-2">
          <div className="inline-flex items-center gap-1.5 text-[length:var(--fs-small)] font-medium text-crit-fg">
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
            {connection.error.code}
          </div>
          <p className="mt-0.5 text-[length:var(--fs-small)] text-text-secondary">
            {connection.error.message}
          </p>
        </div>
      )}
    </li>
  );
}

export function SourcesScreen() {
  const connections = useConnections();
  const health = useSourceHealth();
  const canConnect = useCan('connector.manage');
  const degraded = (health.data?.degraded.length ?? 0) > 0;

  return (
    <div>
      <ScreenHeader
        {...screenHeaderProps('/settings/sources')}
        description="Where the inventory comes from. A source that stops reporting makes every count on every screen short, so its state is stated here and in the top bar."
        actions={
          canConnect ? (
            <Link to="/onboarding" className={buttonClasses('secondary', 'sm')}>
              Add a cloud
            </Link>
          ) : undefined
        }
      />

      {degraded && (
        <Banner tone="warning" className="mb-4">
          <span className="font-medium">Coverage is incomplete.</span> Counts on the Dashboard and
          Identity Inventory exclude the failing source below until it recovers.
        </Banner>
      )}

      <Card>
        <CardHeader
          title="Connected clouds"
          description="Read-only access to AWS, Google Cloud, and Azure."
        />
        <CardBody>
          <QueryBoundary
            query={connections}
            loadingFallback={<SkeletonTableRows rows={3} cols={3} />}
            isEmpty={(d) => d.length === 0}
            empty={
              <p className="inline-flex items-center gap-2 text-[length:var(--fs-small)] text-text-secondary">
                <CloudIcon className="h-4 w-4 text-text-tertiary" aria-hidden="true" />
                No clouds connected yet.
              </p>
            }
          >
            {(conns) => (
              <ul className="space-y-2">
                {conns.map((c) => (
                  <SourceRow key={c.cloud} connection={c} />
                ))}
              </ul>
            )}
          </QueryBoundary>
        </CardBody>
      </Card>
    </div>
  );
}
