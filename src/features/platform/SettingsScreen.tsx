import { Link } from 'react-router-dom';
import { KeyRound, Users as UsersIcon } from 'lucide-react';
import { useConnections } from './queries';
import { useTenant, useUsers } from '@/features/admin/queries';
import { CLOUD_LABELS, SSO_PROVIDER_LABELS, type Tenant } from '@/mocks/types';
import { samlStatus, scimStatus, signInSummary, type SummaryTone } from '@/lib/sso';
import { screenHeaderProps } from '@/app/nav';
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
import { cn } from '@/lib/cn';

function AccountCard() {
  const tenant = useTenant();
  return (
    <Card>
      <CardHeader title="Organization" />
      <CardBody>
        <QueryBoundary
          query={tenant}
          loadingFallback={<SkeletonTableRows rows={4} cols={2} />}
          isEmpty={() => false}
        >
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

const SUMMARY_CLASS: Record<SummaryTone, string> = {
  neutral: 'text-text-secondary',
  warning: 'text-warn-fg',
  critical: 'text-crit-fg',
};

/**
 * Sign-in health, in the same words the setup screen uses. This card is where an
 * admin looks when people cannot get in, so it must never call a broken or
 * untested configuration "not set up" — that sends them to build a new one.
 */
function SsoSummary({ tenant }: { tenant: Tenant }) {
  const now = new Date();
  const saml = samlStatus(tenant.saml, now);
  const provider = SSO_PROVIDER_LABELS[tenant.sso.provider];
  const signIn = signInSummary(tenant.saml, provider, now);

  const scim = scimStatus(tenant.scim);
  const provisioning =
    saml === 'not-started'
      ? null
      : scim === 'connected'
        ? `${tenant.scim.usersReceived} people provisioned from ${provider}.`
        : scim === 'waiting'
          ? 'Waiting for Entra’s first sync.'
          : 'Provisioning is not set up yet.';

  return (
    <div className="space-y-1">
      <p
        className={cn(
          'inline-flex items-start gap-2 text-[length:var(--fs-small)]',
          SUMMARY_CLASS[signIn.tone],
        )}
      >
        <KeyRound className="mt-0.5 h-4 w-4 shrink-0 opacity-70" aria-hidden="true" />
        {signIn.text}
      </p>
      {provisioning && (
        <p className="pl-6 text-[length:var(--fs-small)] text-text-tertiary">{provisioning}</p>
      )}
    </div>
  );
}

function UsersCard() {
  const users = useUsers();
  return (
    <Card>
      <CardHeader
        title="Users"
        description="Assign roles and manage access for the people Entra provisions."
        action={
          <Link to="/settings/users" className={buttonClasses('secondary', 'sm')}>
            Manage users
          </Link>
        }
      />
      <CardBody>
        <QueryBoundary
          query={users}
          loadingFallback={<SkeletonTableRows rows={2} cols={2} />}
          isEmpty={() => false}
        >
          {(list) => {
            const active = list.filter((u) => u.status === 'active').length;
            const waiting = list.filter((u) => u.role === null && u.status !== 'deleted').length;
            return (
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[length:var(--fs-small)] text-text-secondary">
                <span className="inline-flex items-center gap-2">
                  <UsersIcon className="h-4 w-4 text-text-tertiary" aria-hidden="true" />
                  <span className="tnum text-text">{count(list.length)}</span> users
                </span>
                <span>
                  <span className="tnum text-text">{count(active)}</span> active
                </span>
                <span>
                  <span className="tnum text-text">{count(waiting)}</span> awaiting a role
                </span>
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
      <ScreenHeader
        {...screenHeaderProps('/settings')}
        description="Organization, sign-in, connected clouds, and team."
      />

      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <AccountCard />

        <Card>
          <CardHeader
            title="Sign-in & SSO"
            description="Federate sign-in with Microsoft Entra ID and let it provision your users."
            action={
              <QueryBoundary query={tenant} loadingFallback={null} isEmpty={() => false}>
                {(t) => (
                  <Link to="/settings/sso" className={buttonClasses('secondary', 'sm')}>
                    {samlStatus(t.saml, new Date()) === 'not-started' ? 'Set up' : 'Manage'}
                  </Link>
                )}
              </QueryBoundary>
            }
          />
          <CardBody>
            <QueryBoundary
              query={tenant}
              loadingFallback={<SkeletonTableRows rows={1} cols={2} />}
              isEmpty={() => false}
            >
              {(t) => <SsoSummary tenant={t} />}
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
            <QueryBoundary
              query={connections}
              loadingFallback={<SkeletonTableRows rows={3} cols={2} />}
              isEmpty={() => false}
            >
              {(conns) => (
                <ul className="space-y-2">
                  {conns.map((c) => {
                    const total = c.counts ? Object.values(c.counts).reduce((a, b) => a + b, 0) : 0;
                    return (
                      <li
                        key={c.cloud}
                        className="flex items-center justify-between rounded-[var(--r-md)] border border-border bg-surface-2 px-3 py-2"
                      >
                        <span className="inline-flex items-center gap-2 text-[length:var(--fs-small)] text-text">
                          <StatusDot tone={CONN_TONE[c.status]} /> {CLOUD_LABELS[c.cloud]}
                        </span>
                        <span className="tnum text-[length:var(--fs-small)] text-text-tertiary">
                          {pluralize(total, 'identity', 'identities')}
                        </span>
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
