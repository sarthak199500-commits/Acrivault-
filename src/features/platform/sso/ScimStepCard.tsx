import { useState } from 'react';
import { KeyRound, Lock, RadioTower, RefreshCw } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Banner } from '@/components/ui/Banner';
import { timeAgo } from '@/lib/format';
import { errorInfo } from '@/lib/apiError';
import { effectiveScimStatus, scimStatus, scimUnlocked } from '@/lib/sso';
import type { Tenant } from '@/mocks/types';
import { EntraGuide, SCIM_GUIDE_STEPS } from './EntraGuide';
import { AcrivaultChip, CopyField, EntraChip, Mapping, StepStatusPill } from './parts';
import { TokenRevealDialog } from './TokenRevealDialog';
import { useGenerateScimToken } from './queries';

// ASSUMPTION: the SCIM endpoint the backend serves, fixed per deployment.
const SCIM_TENANT_URL = 'https://backend.acrivault.io/scim/v2';

/** After this long with no call from Entra, something is actually wrong. */
const ESCALATE_MS = 10 * 60 * 1000;

/**
 * Step 2. There is no "check status" button: Entra's own Test connection hits the
 * SCIM endpoint, so the card watches for that call instead of asking the admin to
 * come back and poll for something the server already knows.
 */
export function ScimStepCard({ tenant, now, canManage }: { tenant: Tenant; now: Date; canManage: boolean }) {
  const status = scimStatus(tenant.scim);
  const unlocked = scimUnlocked(tenant.saml, now);
  const generate = useGenerateScimToken();

  const [token, setToken] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | undefined>();

  const onGenerate = async () => {
    setBanner(undefined);
    try {
      const result = await generate.mutateAsync(undefined);
      setToken(result.token);
    } catch (err) {
      setBanner(errorInfo(err).message);
    }
  };

  const { tokenIssuedAt, lastSyncAt } = tenant.scim;
  const pill = (() => {
    if (!unlocked) return 'Locked';
    if (status === 'not-started') return 'No token yet';
    if (status === 'waiting' || !lastSyncAt) return 'Waiting for Entra';
    return `Connected · synced ${timeAgo(lastSyncAt, now)}`;
  })();

  const waitedTooLong =
    status === 'waiting' &&
    tokenIssuedAt !== null &&
    now.getTime() - new Date(tokenIssuedAt).getTime() > ESCALATE_MS;

  return (
    <>
      <Card>
        <CardHeader
          title="Step 2 — Provisioning (SCIM)"
          description="Entra sends your people to Acrivault"
          action={<StepStatusPill status={effectiveScimStatus(tenant.saml, tenant.scim, now)} label={pill} />}
        />

        {!unlocked ? (
          <CardBody>
            <p className="flex items-start gap-2 text-[length:var(--fs-small)] text-text-secondary">
              <Lock className="mt-0.5 h-4 w-4 shrink-0 text-text-tertiary" aria-hidden="true" />
              Available once sign-in works. Entra can’t provision into an application it can’t sign
              into.
            </p>
          </CardBody>
        ) : (
          <CardBody className="space-y-5">
            <EntraGuide
              title="Before you start — open Provisioning in Entra"
              steps={SCIM_GUIDE_STEPS}
              done={status !== 'not-started'}
            />

            {banner && <Banner tone="critical">{banner}</Banner>}

            <div className="space-y-3">
              <p className="text-[length:var(--fs-small)] text-text-secondary">
                <Mapping
                  from={<AcrivaultChip>SCIM tenant URL</AcrivaultChip>}
                  to={<EntraChip>Tenant URL</EntraChip>}
                />
              </p>
              <CopyField label="SCIM tenant URL" value={SCIM_TENANT_URL} />

              <div>
                <div className="mb-1 text-[length:var(--fs-small)] font-medium text-text-secondary">
                  Secret token
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <code className="min-w-0 flex-1 truncate rounded-[var(--r-sm)] border border-border bg-surface-2 px-2.5 py-2 font-mono text-[length:var(--fs-small)] text-text-tertiary">
                    {tokenIssuedAt
                      ? '••••••••••••••••••••••••'
                      : 'No token yet. Generate one, then paste it into Entra.'}
                  </code>
                  {canManage && (
                    <Button
                      size="sm"
                      variant={status === 'not-started' ? 'primary' : 'secondary'}
                      leadingIcon={
                        status === 'not-started' ? (
                          <KeyRound className="h-4 w-4" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )
                      }
                      loading={generate.isPending}
                      onClick={() => void onGenerate()}
                    >
                      {status === 'not-started' ? 'Generate token' : 'Rotate token'}
                    </Button>
                  )}
                </div>
                {tokenIssuedAt && (
                  <p className="mt-1 text-[length:var(--fs-micro)] text-text-tertiary">
                    Issued {timeAgo(tokenIssuedAt, now)} · shown once, at generation
                  </p>
                )}
              </div>
            </div>

            {status === 'waiting' && (
              <Banner tone={waitedTooLong ? 'critical' : 'warning'} icon={<RadioTower className="h-4 w-4" />}>
                <p className="font-medium">
                  {waitedTooLong ? 'Entra still hasn’t called' : 'Waiting for Entra’s first sync'}
                </p>
                <p className="mt-0.5">
                  Press <EntraChip>Test connection</EntraChip> in Entra, then <EntraChip>Create</EntraChip>.
                  This updates on its own — there’s nothing to come back and check.
                </p>
                <p className="mt-1.5 text-text-secondary">
                  Two things go wrong here: the token picked up a stray space on the way into Entra,
                  or provisioning was saved but never started.
                </p>
              </Banner>
            )}
          </CardBody>
        )}
      </Card>

      <TokenRevealDialog token={token} onClose={() => setToken(null)} />
    </>
  );
}
