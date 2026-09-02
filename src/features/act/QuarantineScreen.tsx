import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldX } from 'lucide-react';
import { useQuarantined, useReleaseFromQuarantine } from './queries';
import { NHI_TYPE_LABELS } from '@/mocks/types';
import { screenHeaderProps } from '@/app/nav';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { QueryBoundary } from '@/components/ui/QueryBoundary';
import { RoleRestricted } from '@/components/ui/RoleRestricted';
import { ScrollableTable } from '@/components/ui/ScrollableTable';
import { SkeletonTableRows } from '@/components/ui/Skeleton';
import { useCan } from '@/components/ui/Can';
import { dateTime, relativeTime } from '@/lib/format';
import { toast } from '@/stores/toast';
import { errorInfo } from '@/lib/apiError';

/**
 * Act > Quarantine (audit point 5). Quarantine was already producible three
 * ways — a Govern policy, an admin action, a session review — but had no
 * destination that named, for a contained identity, which of the three did it.
 * Every row here resolves that producer and links back to it.
 */
export function QuarantineScreen() {
  const query = useQuarantined();
  const release = useReleaseFromQuarantine();
  const canRelease = useCan('session.quarantineRelease');
  const [confirm, setConfirm] = useState<{ id: string; name: string } | null>(null);

  const runRelease = () => {
    if (!confirm) return;
    release.mutate(confirm.id, {
      onSuccess: () => {
        toast(`${confirm.name} released from quarantine`, { tone: 'success' });
        setConfirm(null);
      },
      onError: (err) => toast(errorInfo(err).message, { tone: 'critical' }),
    });
  };

  return (
    <div>
      <ScreenHeader
        {...screenHeaderProps('/act/quarantine')}
        description="Every contained identity, and what put it there. Quarantine is produced by a Govern policy, an admin action, or a session review — each row names its producer and links back to it."
      />

      {!canRelease && (
        <div className="mb-4">
          <RoleRestricted note="Your role can view quarantined identities but not release them." />
        </div>
      )}

      <QueryBoundary
        query={query}
        loadingFallback={
          <Card>
            <SkeletonTableRows rows={5} cols={4} />
          </Card>
        }
        isEmpty={(d) => d.length === 0}
        empty={
          <Card>
            <EmptyState
              icon={<ShieldX className="h-5 w-5" />}
              headline="Nothing is quarantined"
              guidance="Identities contained by a policy, an admin, or a session review appear here."
            />
          </Card>
        }
      >
        {(rows) => (
          <Card>
            <ScrollableTable label="Quarantined identities">
              <table className="w-full text-left text-[length:var(--fs-small)]">
                <thead>
                  <tr className="border-b border-border text-text-tertiary">
                    <th scope="col" className="px-4 py-2.5 font-medium">
                      Identity
                    </th>
                    <th scope="col" className="px-4 py-2.5 font-medium">
                      Type
                    </th>
                    <th scope="col" className="px-4 py-2.5 font-medium">
                      Quarantined by
                    </th>
                    <th scope="col" className="px-4 py-2.5 font-medium">
                      When
                    </th>
                    <th scope="col" className="px-4 py-2.5 text-right font-medium">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-border last:border-b-0 hover:bg-surface-hover"
                    >
                      <td className="px-4 py-2.5 font-mono text-text">
                        <Link to={`/discover/${row.id}`} className="hover:underline">
                          {row.name}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-text-secondary">{NHI_TYPE_LABELS[row.type]}</td>
                      <td className="px-4 py-2.5 text-text-secondary">
                        {row.byHref ? (
                          <Link to={row.byHref} className="text-accent-text hover:underline">
                            {row.byLabel}
                          </Link>
                        ) : (
                          row.byLabel
                        )}
                      </td>
                      <td className="tnum px-4 py-2.5 text-text-tertiary" title={dateTime(row.at)}>
                        {relativeTime(row.at)}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {canRelease && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setConfirm({ id: row.id, name: row.name })}
                          >
                            Release
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollableTable>
          </Card>
        )}
      </QueryBoundary>

      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="Release from quarantine"
        description={
          confirm
            ? `Release ${confirm.name}? It regains its permissions immediately, and the release is written to the audit log.`
            : undefined
        }
        confirmLabel="Release"
        pending={release.isPending}
        onConfirm={runRelease}
      />
    </div>
  );
}
