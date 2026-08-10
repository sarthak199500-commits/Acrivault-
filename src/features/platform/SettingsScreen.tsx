import { Link } from 'react-router-dom';
import { KeyRound, Users as UsersIcon } from 'lucide-react';
import { useConnections } from './queries';
import { useTenant, useUsers } from '@/features/admin/queries';
import { CLOUD_LABELS, SSO_PROVIDER_LABELS } from '@/mocks/types';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { StatusDot } from '@/components/ui/StatusDot';
import { KeyValueList } from '@/components/ui/KeyValueList';
import { QueryBoundary } from '@/components/ui/QueryBoundary';
import { SkeletonTableRows } from '@/components/ui/Skeleton';
import { buttonClasses } from '@/components/ui/Button';
import { useCan } from '@/components/ui/Can';
import { count, pluralize } from '@/lib/format';
import { CONNECTION_TONE as CONN_TONE } from '@/lib/tones';


function AccountCard() {
  const tenant = useTenant();
  return (
    <Card>
      <CardHeader title="Organization" />
      <CardBody>
        <QueryBoundary query={tenant} loadingFallback={<SkeletonTableRows rows={4} cols={2} />} isEmpty={() => false}>
          {(t) => (
            <KeyValueList
              items={[
                { label: 'Organization', value: `${t.name} (synthetic)` },
                { label: 'Allowed domains', value: t.allowedDomains.join(', ') || '—' },
                {
                  label: 'Identity provider',
                  value: SSO_PROVIDER_LABELS[t.sso.provider],
                },
                { label: 'Data', value: <Badge tone="info">Synthetic</Badge> },
              ]}
            />
          )}
        </QueryBoundary>
      </CardBody>
    </Card>
  );
}

function UsersCard() {
  const users = useUsers();
  return (
    <Card>
      <CardHeader
        title="Users"
        description="Add teammates, assign roles, and manage access."
        action={
          <Link to="/settings/users" className={buttonClasses('secondary', 'sm')}>
            Manage users
          </Link>
        }
      />
      <CardBody>
        <QueryBoundary query={users} loadingFallback={<SkeletonTableRows rows={2} cols={2} />} isEmpty={() => false}>
          {(list) => {
            const active = list.filter((u) => u.status === 'active').length;
            const pending = list.filter((u) => u.status === 'pending' || u.status === 'invited').length;
            return (
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[length:var(--fs-small)] text-text-secondary">
                <span className="inline-flex items-center gap-2">
                  <UsersIcon className="h-4 w-4 text-text-tertiary" aria-hidden="true" />
                  <span className="tnum text-text">{count(list.length)}</span> users
                </span>
                <span><span className="tnum text-text">{count(active)}</span> active</span>
                <span><span className="tnum text-text">{count(pending)}</span> pending</span>
              </div>
            );
          }}
        </QueryBoundary>
      </CardBody>
    </Card>
  );
}

export function SettingsScreen() {
  const connections = useConnections();
  const tenant = useTenant();
  const canConnect = useCan('connector.manage');

  return (
    <div>
      <ScreenHeader eyebrow="Platform" title="Settings" description="Organization, sign-in, connected clouds, and team." />

      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <AccountCard />

        <Card>
          <CardHeader
            title="Sign-in & SSO"
            description="SAML / OIDC configuration and allowed domains."
            action={<Link to="/settings/sso" className={buttonClasses('secondary', 'sm')}>Configure</Link>}
          />
          <CardBody>
            <QueryBoundary query={tenant} loadingFallback={<SkeletonTableRows rows={1} cols={2} />} isEmpty={() => false}>
              {(t) => (
                <p className="inline-flex items-center gap-2 text-[length:var(--fs-small)] text-text-secondary">
                  <KeyRound className="h-4 w-4 text-text-tertiary" aria-hidden="true" />
                  {t.sso.configured
                    ? `Single sign-on is configured via ${SSO_PROVIDER_LABELS[t.sso.provider]}.`
                    : 'Single sign-on is not yet enabled.'}
                </p>
              )}
            </QueryBoundary>
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Connected clouds"
            description="Read-only access to AWS, GCP, and Azure."
            action={
              canConnect ? (
                <Link to="/onboarding" className={buttonClasses('secondary', 'sm')}>
                  Add a cloud
                </Link>
              ) : undefined
            }
          />
          <CardBody>
            <QueryBoundary query={connections} loadingFallback={<SkeletonTableRows rows={3} cols={2} />} isEmpty={() => false}>
              {(conns) => (
                <ul className="space-y-2">
                  {conns.map((c) => {
                    const total = c.counts ? Object.values(c.counts).reduce((a, b) => a + b, 0) : 0;
                    return (
                      <li key={c.cloud} className="flex items-center justify-between rounded-[var(--r-md)] border border-border bg-surface-2 px-3 py-2">
                        <span className="inline-flex items-center gap-2 text-[length:var(--fs-small)] text-text">
                          <StatusDot tone={CONN_TONE[c.status]} /> {CLOUD_LABELS[c.cloud]}
                        </span>
                        <span className="tnum text-[length:var(--fs-small)] text-text-tertiary">{pluralize(total, 'identity', 'identities')}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </QueryBoundary>
          </CardBody>
        </Card>

        <div className="lg:col-span-2">
          <UsersCard />
        </div>
      </div>
    </div>
  );
}
