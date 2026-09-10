import { useState } from 'react';
import { useTenant, useUsers } from '@/features/admin/queries';
import { TransferOwnershipDialog } from '../TransferOwnershipDialog';
import { AUDIT_RETENTION_LABEL, SSO_PROVIDER_LABELS } from '@/mocks/types';
import { screenHeaderProps } from '@/app/nav';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { KeyValueList } from '@/components/ui/KeyValueList';
import { QueryBoundary } from '@/components/ui/QueryBoundary';
import { SkeletonTableRows } from '@/components/ui/Skeleton';
import { useCan } from '@/components/ui/Can';

export function OrganizationPane() {
  const tenant = useTenant();
  const users = useUsers();
  const canTransfer = useCan('tenant.transferOwnership');
  const [transferOpen, setTransferOpen] = useState(false);

  return (
    <div>
      <ScreenHeader
        {...screenHeaderProps('/settings/general')}
        description="What this tenant is, and who owns it."
      />

      <Card>
        <CardHeader title="Details" />
        <CardBody>
          <QueryBoundary
            query={tenant}
            loadingFallback={<SkeletonTableRows rows={5} cols={2} />}
            isEmpty={() => false}
          >
            {(t) => {
              const owner = (users.data ?? []).find((u) => u.role === 'tenant-owner');
              return (
                <>
                  <KeyValueList
                    items={[
                      { label: 'Organization', value: `${t.name} (synthetic)` },
                      { label: 'Allowed domains', value: t.allowedDomains.join(', ') || '—' },
                      {
                        label: 'Identity provider',
                        value: SSO_PROVIDER_LABELS[t.sso.provider],
                      },
                      // Retention was only ever a footnote on the Audit screen,
                      // which is not where an admin looks for what the product
                      // keeps.
                      { label: 'Audit retention', value: AUDIT_RETENTION_LABEL },
                      {
                        label: 'Owner',
                        value: (
                          <span className="inline-flex flex-wrap items-center gap-2">
                            <span>{owner ? owner.email : '—'}</span>
                            {canTransfer && (
                              <button
                                type="button"
                                onClick={() => setTransferOpen(true)}
                                className="text-[length:var(--fs-small)] text-accent-text hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--accent)_35%,transparent)]"
                              >
                                Transfer
                              </button>
                            )}
                          </span>
                        ),
                      },
                      { label: 'Data', value: <Badge tone="info">Synthetic</Badge> },
                    ]}
                  />
                  {/* A read-only field with no stated reason reads as a bug. */}
                  <p className="mt-2 text-[length:var(--fs-micro)] text-text-tertiary">
                    Adding a domain needs a DNS check, so it runs through the verification flow
                    rather than this field.
                  </p>
                  <TransferOwnershipDialog
                    open={transferOpen}
                    onOpenChange={setTransferOpen}
                    users={users.data ?? []}
                  />
                </>
              );
            }}
          </QueryBoundary>
        </CardBody>
      </Card>
    </div>
  );
}
