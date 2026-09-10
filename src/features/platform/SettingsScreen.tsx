import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, KeyRound, ShieldCheck, UserRound, Users as UsersIcon } from 'lucide-react';
import { useConnections, useNotificationRouting } from './queries';
import { SessionAccessCard } from './SessionAccessCard';
import { TransferOwnershipDialog } from './TransferOwnershipDialog';
import { useTenant, useUsers } from '@/features/admin/queries';
import {
  AUDIT_RETENTION_LABEL,
  CLOUD_LABELS,
  SSO_PROVIDER_LABELS,
  totalFor,
  type Tenant,
  type User,
} from '@/mocks/types';
import { samlStatus, scimStatus, signInSummary, type SummaryTone } from '@/lib/sso';
import { screenHeaderProps } from '@/app/nav';
import { ROLE_LABELS } from '@/lib/permissions';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { StatusDot } from '@/components/ui/StatusDot';
import { KeyValueList } from '@/components/ui/KeyValueList';
import { QueryBoundary } from '@/components/ui/QueryBoundary';
import { SkeletonTableRows } from '@/components/ui/Skeleton';
import { RoleRestricted } from '@/components/ui/RoleRestricted';
import { buttonClasses } from '@/components/ui/Button';
import { useCan } from '@/components/ui/Can';
import { count, pluralize, relativeTime } from '@/lib/format';
import { CONNECTION_TONE as CONN_TONE } from '@/lib/tones';
import { cn } from '@/lib/cn';
import { CURRENT_USER_ID } from '@/stores/auth';
import { useUiStore } from '@/stores/ui';

/**
 * The signed-in person's own record.
 *
 * Everything here is a real field on the user, or an action that reaches a flow
 * the app already has. Deliberately NOT shown: a recovery-code count and an MFA
 * device name, which the model does not hold — inventing either would put a
 * number on screen that no flow ever updates, which is the same failure the
 * MFA-by-role table in Sessions & access refuses to commit.
 * // ASSUMPTION: identity, MFA enrolment and credentials are upstream.
 */
function AccountCard() {
  const users = useUsers();
  const viewingRole = useUiStore((s) => s.role);

  return (
    <Card>
      <CardHeader
        title="Your account"
        description="Who you are signed in as, and how you prove it."
        action={<UserRound className="h-4 w-4 text-text-tertiary" aria-hidden="true" />}
      />
      <CardBody>
        <QueryBoundary
          query={users}
          loadingFallback={<SkeletonTableRows rows={4} cols={2} />}
          isEmpty={() => false}
        >
          {(list) => {
            const me: User | undefined = list.find((u) => u.id === CURRENT_USER_ID);
            if (!me) {
              return (
                <p className="text-[length:var(--fs-small)] text-text-secondary">
                  Your account is not in this tenant&apos;s user list.
                </p>
              );
            }
            const password = me.authMethod === 'password';
            return (
              <>
                <KeyValueList
                  items={[
                    { label: 'Name', value: me.name },
                    { label: 'Email', value: me.email },
                    {
                      label: 'Role',
                      value:
                        me.role === null ? (
                          <Badge tone="warning">Awaiting a role</Badge>
                        ) : (
                          ROLE_LABELS[me.role]
                        ),
                    },
                    {
                      label: 'Sign-in',
                      value: password
                        ? 'Password'
                        : `Federated via ${SSO_PROVIDER_LABELS.entra}`,
                    },
                    {
                      label: 'Last sign-in',
                      value: me.lastLogin ? relativeTime(me.lastLogin) : '—',
                    },
                  ]}
                />
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Link to="/mfa/setup" className={buttonClasses('secondary', 'sm')}>
                    <ShieldCheck className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                    Re-enroll authenticator
                  </Link>
                  {password && (
                    <Link to="/forgot-password" className={buttonClasses('secondary', 'sm')}>
                      Change password
                    </Link>
                  )}
                </div>
                <p className="mt-2 text-[length:var(--fs-micro)] text-text-tertiary">
                  Name and email come from {SSO_PROVIDER_LABELS.entra} and change there, not here.
                  {viewingRole !== me.role && me.role !== null && (
                    <>
                      {' '}
                      You are previewing the product as {ROLE_LABELS[viewingRole]}; your real role
                      is {ROLE_LABELS[me.role]}.
                    </>
                  )}
                </p>
              </>
            );
          }}
        </QueryBoundary>
      </CardBody>
    </Card>
  );
}

/** Notification delivery, discoverable from Settings rather than only from the feed. */
function NotificationsCard() {
  const routing = useNotificationRouting();
  const canRoute = useCan('notifications.routing');

  return (
    <Card>
      <CardHeader
        title="Notifications"
        description="In-app and email delivery, the weekly digest, and where the organization's alerts route."
        action={
          <Link to="/settings/notifications" className={buttonClasses('secondary', 'sm')}>
            Manage
          </Link>
        }
      />
      <CardBody>
        <QueryBoundary query={routing} loadingFallback={<SkeletonTableRows rows={1} cols={2} />} isEmpty={() => false}>
          {(r) => {
            const live = r.destinations.filter((d) => d.enabled).length;
            return (
              <p className="inline-flex items-start gap-2 text-[length:var(--fs-small)] text-text-secondary">
                <Bell className="mt-0.5 h-4 w-4 shrink-0 text-text-tertiary" aria-hidden="true" />
                <span>
                  Tenant routing sends <span className="text-text">{r.minSeverity}</span> and above
                  to {pluralize(live, 'destination', 'destinations')}.
                  {!canRoute && ' Your own delivery choices are yours to set.'}
                </span>
              </p>
            );
          }}
        </QueryBoundary>
      </CardBody>
    </Card>
  );
}

function OrganizationCard() {
  const tenant = useTenant();
  const users = useUsers();
  const canTransfer = useCan('tenant.transferOwnership');
  const [transferOpen, setTransferOpen] = useState(false);

  return (
    <Card>
      <CardHeader title="Organization" />
      <CardBody>
        <QueryBoundary
          query={tenant}
          loadingFallback={<SkeletonTableRows rows={4} cols={2} />}
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
                  Adding a domain needs a DNS check, so it runs through the verification flow rather
                  than this field.
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
  const tenant = useTenant();
  const canManage = useCan('users.manage');

  return (
    <Card>
      <CardHeader
        title="Users"
        description="Assign roles and manage access for the people Entra provisions."
        action={
          <Link to="/settings/users" className={buttonClasses('secondary', 'sm')}>
            {/* The verb has to match what the role can actually do there. An
                Auditor was offered "Manage users" and landed on a screen where
                every control is disabled. */}
            {canManage ? 'Manage users' : 'View users'}
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
            // Every non-active, non-deleted state, counted together: the old
            // card showed 12 total and 9 active and never said what the other
            // three were — and suspension is the security-relevant one.
            const suspended = list.filter((u) => u.status.startsWith('suspended')).length;
            const waiting = list.filter((u) => u.role === null && u.status !== 'deleted').length;
            const provisioned = tenant.data?.scim.usersReceived;
            const local = provisioned === undefined ? 0 : list.length - provisioned;
            return (
              <>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[length:var(--fs-small)] text-text-secondary">
                  <span className="inline-flex items-center gap-2">
                    <UsersIcon className="h-4 w-4 text-text-tertiary" aria-hidden="true" />
                    <span className="tnum text-text">{count(list.length)}</span> users
                  </span>
                  <span>
                    <span className="tnum text-text">{count(active)}</span> active
                  </span>
                  {suspended > 0 && (
                    <span>
                      <span className="tnum text-warn-fg">{count(suspended)}</span> suspended
                    </span>
                  )}
                  <span>
                    <span className="tnum text-text">{count(waiting)}</span> awaiting a role
                  </span>
                </div>
                {/* Two cards on this screen quote a user count. Left
                    unexplained, 11 provisioned against 12 users reads as one of
                    them being wrong. */}
                {provisioned !== undefined && local > 0 && (
                  <p className="mt-2 text-[length:var(--fs-micro)] text-text-tertiary">
                    Entra provisions {count(provisioned)};{' '}
                    {pluralize(local, 'account was', 'accounts were')} created before SSO.
                  </p>
                )}
                {!canManage && (
                  <RoleRestricted
                    className="mt-3"
                    action="modify users"
                    remedy="Tenant Admin"
                  />
                )}
              </>
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
  const canManageSso = useCan('sso.manage');

  return (
    <div>
      <ScreenHeader
        {...screenHeaderProps('/settings')}
        description="Your account, the organization, sign-in, notifications, connected clouds, and team."
      />

      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <AccountCard />
        <OrganizationCard />

        <Card>
          <CardHeader
            title="Sign-in & SSO"
            description="Federate sign-in with Microsoft Entra ID and let it provision your users."
            action={
              <QueryBoundary query={tenant} loadingFallback={null} isEmpty={() => false}>
                {(t) => (
                  <Link to="/settings/sso" className={buttonClasses('secondary', 'sm')}>
                    {!canManageSso
                      ? 'View'
                      : samlStatus(t.saml, new Date()) === 'not-started'
                        ? 'Set up'
                        : 'Manage'}
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

        <NotificationsCard />

        <SessionAccessCard />

        <Card className="lg:col-span-2">
          <CardHeader
            title="Connected clouds"
            description="Read-only access to AWS, Google Cloud, and Azure."
            action={
              <Link to="/settings/sources" className={buttonClasses('secondary', 'sm')}>
                View sources
              </Link>
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
                    const total = totalFor(c);
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
