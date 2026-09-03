import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { screenHeaderProps } from '@/app/nav';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { QueryBoundary } from '@/components/ui/QueryBoundary';
import { RoleRestricted } from '@/components/ui/RoleRestricted';
import { Skeleton } from '@/components/ui/Skeleton';
import { useCan } from '@/components/ui/Can';
import { cn } from '@/lib/cn';
import { effectiveScimStatus, samlStatus, type StepStatus } from '@/lib/sso';
import { needsRole } from '@/lib/user';
import { useUsers } from '@/features/admin/queries';
import { SamlStepCard } from './SamlStepCard';
import { ScimStepCard } from './ScimStepCard';
import { useTenantLive } from './queries';

/**
 * The stepper is derived from what each step has actually achieved, never from
 * how many fields are filled in. It cannot show two ticks over a missing token.
 */
function Stepper({ saml, scim }: { saml: StepStatus; scim: StepStatus }) {
  const nodes: { label: string; status: StepStatus }[] = [
    { label: 'Sign-in', status: saml },
    { label: 'Provisioning', status: scim },
  ];
  const note =
    saml === 'waiting'
      ? '— sign-in is not proven yet'
      : scim === 'waiting'
        ? '— waiting on Entra'
        : scim === 'not-started'
          ? '— finish sign-in first'
          : null;

  return (
    <ol className="mb-5 flex flex-wrap items-center gap-2.5" aria-label="Setup progress">
      {nodes.map((node, i) => {
        const done = node.status === 'connected';
        const busy = node.status === 'waiting' || node.status === 'attention';
        const bad = node.status === 'failing';
        return (
          <li key={node.label} className="flex items-center gap-2.5">
            {i > 0 && <span aria-hidden="true" className="h-px w-8 bg-border-strong" />}
            <span
              aria-hidden="true"
              className={cn(
                'tnum flex h-5 w-5 items-center justify-center rounded-full border text-[length:var(--fs-micro)]',
                done && 'border-accent bg-accent text-white',
                busy && 'border-[var(--warn-fg)] text-warn-fg',
                bad && 'border-[var(--crit-fg)] text-crit-fg',
                !done && !busy && !bad && 'border-border text-text-tertiary',
              )}
            >
              {done ? <Check className="h-3 w-3" /> : i + 1}
            </span>
            <span
              className={cn(
                'text-[length:var(--fs-small)]',
                done ? 'text-text' : busy ? 'text-warn-fg' : bad ? 'text-crit-fg' : 'text-text-tertiary',
              )}
            >
              {node.label}
              <span className="sr-only">
                {' '}
                — {done ? 'connected' : busy ? 'waiting' : bad ? 'failing' : 'not started'}
              </span>
            </span>
          </li>
        );
      })}
      {note && <li className="text-[length:var(--fs-small)] text-text-tertiary">{note}</li>}
    </ol>
  );
}

/**
 * What Entra has actually sent, and the one account it does not manage. The old
 * screen reported this as "4 of 5 users came from Azure", which raised the
 * question of the fifth without answering it.
 */
function PeopleCard() {
  const users = useUsers();
  const list = users.data ?? [];
  const fromEntra = list.filter((u) => u.source === 'entra');
  const local = list.filter((u) => u.source === 'local');
  const waiting = fromEntra.filter(needsRole).length;

  return (
    <Card>
      <CardHeader title="Your people" />
      <CardBody>
        <QueryBoundary query={users} loadingFallback={<Skeleton className="h-16 w-full" />} isEmpty={() => false}>
          {() =>
            fromEntra.length === 0 ? (
              <p className="text-[length:var(--fs-small)] text-text-secondary">
                Nobody yet. Once provisioning runs, everyone Entra assigns to the application appears
                here without an invitation.
              </p>
            ) : (
              <div className="space-y-3">
                <p className="text-[length:var(--fs-body)] text-text">
                  <span className="tnum text-[length:var(--fs-h2)] font-semibold">{fromEntra.length}</span>{' '}
                  people came from Entra
                  {waiting > 0 && (
                    <>
                      {' · '}
                      <span className="text-warn-fg">
                        <span className="tnum">{waiting}</span> need a role
                      </span>
                    </>
                  )}
                </p>
                {local.length > 0 && (
                  <p className="text-[length:var(--fs-small)] text-text-secondary">
                    Plus {local.length === 1 ? 'your own account' : `${local.length} local accounts`},
                    which Entra doesn’t manage — that’s how you get back in if sign-in ever breaks.
                  </p>
                )}
                <Link to="/settings/users">
                  <Button variant="secondary" size="sm" trailingIcon={<ArrowRight className="h-4 w-4" />}>
                    Go to manage users
                  </Button>
                </Link>
              </div>
            )
          }
        </QueryBoundary>
      </CardBody>
    </Card>
  );
}

export function SsoScreen() {
  const navigate = useNavigate();
  const canManage = useCan('sso.manage');
  const live = useTenantLive();
  // Real time, not the seed's frozen NOW: everything on this screen can be moved
  // by an action taken on it, and a just-saved timestamp must not read as future.
  const now = new Date();

  return (
    <div className="mx-auto max-w-3xl">
      <ScreenHeader
        {...screenHeaderProps('/settings/sso')}
        description="Microsoft Entra ID signs your people in and sends them to Acrivault."
        actions={
          <Button
            variant="ghost"
            size="sm"
            leadingIcon={<ArrowLeft className="h-4 w-4" />}
            onClick={() => navigate('/settings/users')}
          >
            Back to users
          </Button>
        }
      />

      {!canManage && (
        <div className="mb-4">
          <RoleRestricted note="Only a Tenant Admin can configure single sign-on. You can view the current status." />
        </div>
      )}

      <QueryBoundary query={live} loadingFallback={<Skeleton className="h-64 w-full" />} isEmpty={() => false}>
        {(t) => (
          <div className="space-y-4">
            <Stepper saml={samlStatus(t.saml, now)} scim={effectiveScimStatus(t.saml, t.scim, now)} />
            <SamlStepCard tenant={t} now={now} canManage={canManage} />
            <ScimStepCard tenant={t} now={now} canManage={canManage} />
            <PeopleCard />
          </div>
        )}
      </QueryBoundary>
    </div>
  );
}
