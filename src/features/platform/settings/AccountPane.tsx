import { Link } from 'react-router-dom';
import { ShieldCheck, UserRound } from 'lucide-react';
import { useUsers } from '@/features/admin/queries';
import { SSO_PROVIDER_LABELS, type User } from '@/mocks/types';
import { screenHeaderProps } from '@/app/nav';
import { ROLE_LABELS } from '@/lib/permissions';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { KeyValueList } from '@/components/ui/KeyValueList';
import { QueryBoundary } from '@/components/ui/QueryBoundary';
import { SkeletonTableRows } from '@/components/ui/Skeleton';
import { buttonClasses } from '@/components/ui/Button';
import { relativeTime } from '@/lib/format';
import { CURRENT_USER_ID } from '@/stores/auth';
import { useUiStore } from '@/stores/ui';

/**
 * The signed-in person's own record.
 *
 * Everything here is a real field on the user, or an action that reaches a flow
 * the app already has. Deliberately NOT shown: a recovery-code count and an MFA
 * device name, which the model does not hold — inventing either would put a
 * number on screen that no flow ever updates, which is the same failure the
 * read-only MFA-by-role table in Sessions & access refuses to commit.
 * // ASSUMPTION: identity, MFA enrolment and credentials are upstream.
 */
export function AccountPane() {
  const users = useUsers();
  const viewingRole = useUiStore((s) => s.role);

  return (
    <div>
      <ScreenHeader
        {...screenHeaderProps('/settings/account')}
        description="Who you are signed in as, and how you prove it."
      />

      <Card>
        <CardHeader
          title="Profile"
          action={<UserRound className="h-4 w-4 text-text-tertiary" aria-hidden="true" />}
        />
        <CardBody>
          <QueryBoundary
            query={users}
            loadingFallback={<SkeletonTableRows rows={5} cols={2} />}
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
    </div>
  );
}
