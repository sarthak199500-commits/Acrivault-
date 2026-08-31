import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeftRight, Award, Lock, Pencil, ShieldCheck } from 'lucide-react';
import { Card, CardBody, CardFooter, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Banner } from '@/components/ui/Banner';
import { InlineAlert } from '@/components/ui/InlineAlert';
import { date as formatDate, timeAgo } from '@/lib/format';
import { errorInfo } from '@/lib/apiError';
import {
  CERT_WARN_DAYS,
  certDaysLeft,
  samlStatus,
  swapDraft,
  validateSaml,
  type SamlDraft,
  type SamlField,
  type SamlIssue,
} from '@/lib/sso';
import type { Tenant } from '@/mocks/types';
import { toast } from '@/stores/toast';
import { EntraGuide, SAML_GUIDE_STEPS } from './EntraGuide';
import { AcrivaultChip, CopyField, EntraChip, Mapping, StepStatusPill } from './parts';
import { useSaveSaml, useTestSignIn } from './queries';

// ASSUMPTION: these are the service-provider URLs the backend serves. Fixed per
// deployment, not per tenant.
const SP_ENTITY_ID = 'https://backend.acrivault.io/saml/metadata';
const SP_ACS_URL = 'https://backend.acrivault.io/saml/acs';

const EMPTY: SamlDraft = { entityId: '', ssoUrl: '', certificate: '' };

function draftOf(t: Tenant): SamlDraft {
  return {
    entityId: t.saml.entityId ?? '',
    ssoUrl: t.saml.ssoUrl ?? '',
    certificate: t.saml.certificate ?? '',
  };
}

/** The message for a field, or undefined. Only the first issue is spoken aloud. */
function fieldError(issues: SamlIssue[], field: SamlField): string | undefined {
  const first = issues[0];
  if (!first) return undefined;
  if (first.kind === 'swapped') {
    return field === 'entityId'
      ? 'That’s the sign-on URL — it belongs in the field below.'
      : undefined;
  }
  if (first.kind === 'required' && first.field === field) return 'Required.';
  if (first.kind === 'wrong-value' && first.field === field) {
    return field === 'entityId'
      ? 'Entra’s identifier is the sts.windows.net address.'
      : 'Entra’s Login URL is the login.microsoftonline.com address.';
  }
  if (first.kind === 'cert-format' && field === 'certificate') {
    if (first.problem === 'xml') {
      return 'That’s the Federation Metadata XML. In Entra, press Download beside Certificate (Base64) instead.';
    }
    if (first.problem === 'raw') {
      return 'That looks like Certificate (Raw). Acrivault needs Certificate (Base64).';
    }
    return 'This isn’t a Base64 certificate. Open the downloaded file in a text editor and paste all of it.';
  }
  return undefined;
}

/**
 * Step 1. A saved configuration is only ever a claim — the pill goes green when a
 * real assertion lands, and saving a change resets it, because the alternative is
 * showing "connected" over a certificate nobody has tested.
 */
export function SamlStepCard({ tenant, now, canManage }: { tenant: Tenant; now: Date; canManage: boolean }) {
  const status = samlStatus(tenant.saml, now);
  const configured = tenant.saml.savedAt !== null;

  const [editing, setEditing] = useState(!configured);
  const [draft, setDraft] = useState<SamlDraft>(() => (configured ? draftOf(tenant) : EMPTY));
  const [showErrors, setShowErrors] = useState(false);
  const [banner, setBanner] = useState<string | undefined>();

  const save = useSaveSaml();
  const test = useTestSignIn();

  // Reopening the form always starts from what is actually saved.
  useEffect(() => {
    if (!editing) setDraft(configured ? draftOf(tenant) : EMPTY);
  }, [editing, configured, tenant]);

  const issues = useMemo(() => validateSaml(draft), [draft]);
  const visible = showErrors ? issues : [];
  const swapped = visible[0]?.kind === 'swapped';

  const set = (field: SamlField) => (value: string) => setDraft((d) => ({ ...d, [field]: value }));

  const onSave = async () => {
    setShowErrors(true);
    setBanner(undefined);
    if (issues.length > 0) return;
    try {
      await save.mutateAsync(draft);
      setEditing(false);
      setShowErrors(false);
      toast('Configuration saved', {
        tone: 'success',
        description: 'Test sign-in to confirm Entra accepts it.',
      });
    } catch (err) {
      setBanner(errorInfo(err).message);
    }
  };

  const onTest = async () => {
    setBanner(undefined);
    try {
      await test.mutateAsync(undefined);
      toast('Sign-in works', { tone: 'success', description: 'Entra issued a valid assertion.' });
    } catch (err) {
      setBanner(errorInfo(err).message);
    }
  };

  const cert = tenant.saml.cert;
  const daysLeft = cert ? certDaysLeft(cert, now) : null;

  const lastSignIn = tenant.saml.lastSignInAt;
  const pill = (() => {
    if (status === 'not-started') return 'Not started';
    if (status === 'failing') return 'Certificate expired';
    if (status === 'attention') return `Certificate expires in ${daysLeft} days`;
    if (status === 'waiting' || !lastSignIn) return 'Awaiting first sign-in';
    return `Connected · signed in ${timeAgo(lastSignIn, now)}`;
  })();

  return (
    <Card>
      <CardHeader
        title="Step 1 — Sign-in (SAML)"
        description="Tenant Admin only"
        action={<StepStatusPill status={status} label={pill} />}
      />

      {!editing ? (
        <CardBody className="space-y-3">
          <dl className="space-y-1 text-[length:var(--fs-small)] text-text-secondary">
            <div>Last successful sign-in {lastSignIn ? timeAgo(lastSignIn, now) : '— not yet tested'}</div>
            {cert && (
              <div className={daysLeft !== null && daysLeft <= CERT_WARN_DAYS ? 'text-warn-fg' : undefined}>
                Certificate valid to {formatDate(cert.expiresAt)}
                {daysLeft !== null && daysLeft <= CERT_WARN_DAYS
                  ? ` — roll it in Entra first, then paste the new one here`
                  : ''}
              </div>
            )}
          </dl>
          {status === 'waiting' && (
            <InlineAlert tone="warning" title="Not proven yet.">
              The fields are saved, but nobody has signed in with them. Test it before you rely on it.
            </InlineAlert>
          )}
          {banner && <Banner tone="critical">{banner}</Banner>}
          {canManage && (
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="secondary"
                leadingIcon={<Pencil className="h-4 w-4" />}
                onClick={() => setEditing(true)}
              >
                Edit
              </Button>
              <Button
                size="sm"
                variant={status === 'waiting' ? 'primary' : 'secondary'}
                leadingIcon={<ShieldCheck className="h-4 w-4" />}
                loading={test.isPending}
                onClick={() => void onTest()}
              >
                Test sign-in
              </Button>
            </div>
          )}
        </CardBody>
      ) : (
        <CardBody className="space-y-5">
          <EntraGuide title="Before you start — create the app in Entra" steps={SAML_GUIDE_STEPS} done={configured} />

          {banner && <Banner tone="critical">{banner}</Banner>}

          {configured && (
            <InlineAlert tone="warning" title="You’re editing a working configuration.">
              Sign-in keeps working until you save. After that it stays unproven until a test passes,
              so change the certificate in Entra first.
            </InlineAlert>
          )}

          <section className="space-y-3">
            <div>
              <h3 className="text-[length:var(--fs-body)] font-medium text-text">Copy Acrivault’s URLs into Entra</h3>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[length:var(--fs-small)] text-text-secondary">
                <Mapping from={<AcrivaultChip>Entity identity URL</AcrivaultChip>} to={<EntraChip>Add identifier</EntraChip>} />
                <Mapping from={<AcrivaultChip>ACS URL</AcrivaultChip>} to={<EntraChip>Add reply URL</EntraChip>} />
              </p>
            </div>
            <CopyField label="Service provider entity identity URL" value={SP_ENTITY_ID} />
            <CopyField label="Service provider assertion consumer service URL" value={SP_ACS_URL} />
          </section>

          <section className="space-y-3">
            <div>
              <h3 className="text-[length:var(--fs-body)] font-medium text-text">Bring Entra’s values back</h3>
              <p className="mt-1 text-[length:var(--fs-small)] text-text-secondary">
                Under <EntraChip>Set up &lt;your app name&gt;</EntraChip> and{' '}
                <EntraChip>SAML Certificates</EntraChip>. Paste them in any order — Acrivault checks
                them.
              </p>
            </div>

            <Input
              label="Identity provider entity ID"
              placeholder="https://sts.windows.net/<tenant-guid>/"
              value={draft.entityId}
              error={fieldError(visible, 'entityId')}
              onChange={(e) => set('entityId')(e.target.value)}
            />

            {swapped && (
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-crit-fg" aria-hidden="true" />
                <span className="flex-1 text-[length:var(--fs-small)] text-crit-fg">
                  These two are the wrong way round.
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  leadingIcon={<ArrowLeftRight className="h-4 w-4" />}
                  onClick={() => setDraft(swapDraft(draft))}
                >
                  Swap them
                </Button>
              </div>
            )}

            <Input
              label="Identity provider single sign-on URL"
              placeholder="https://login.microsoftonline.com/<tenant-guid>/saml2"
              value={draft.ssoUrl}
              error={fieldError(visible, 'ssoUrl')}
              onChange={(e) => set('ssoUrl')(e.target.value)}
            />

            {visible[0]?.kind === 'tenant-mismatch' && (
              <InlineAlert tone="critical" title="These came from two different Entra tenants.">
                The GUID in the entity ID doesn’t match the one in the sign-on URL. Take both values
                from the same application.
              </InlineAlert>
            )}

            <Textarea
              label="Public x509 certificate"
              rows={6}
              className="font-mono"
              placeholder="-----BEGIN CERTIFICATE-----"
              value={draft.certificate}
              error={fieldError(visible, 'certificate')}
              hint="This is a public key, not a secret — it is safe to paste and to store."
              onChange={(e) => set('certificate')(e.target.value)}
            />

            {cert && !editingChanged(draft, tenant) && (
              <div className="rounded-[var(--r-sm)] border border-border bg-surface-2 px-3 py-2">
                <p className="flex items-center gap-2 text-[length:var(--fs-small)] text-text">
                  <Award className="h-4 w-4 shrink-0 text-ok-fg" aria-hidden="true" />
                  {cert.subject}
                </p>
                <p className="mt-0.5 font-mono text-[length:var(--fs-micro)] text-text-tertiary">
                  {cert.thumbprint} · valid to {formatDate(cert.expiresAt)}
                </p>
              </div>
            )}

            <p className="text-[length:var(--fs-micro)] text-text-tertiary">
              Acrivault doesn’t use these — leave them alone: <EntraChip>Logout URL</EntraChip>{' '}
              <EntraChip>App Federation Metadata Url</EntraChip>
            </p>
          </section>
        </CardBody>
      )}

      {editing && (
        <CardFooter className="justify-between">
          <span className="flex items-center gap-1.5 text-[length:var(--fs-micro)] text-text-tertiary">
            <Lock className="h-3.5 w-3.5" aria-hidden="true" />
            Password sign-in stays on until a test sign-in passes.
          </span>
          <span className="flex gap-2">
            {configured && (
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            )}
            <Button size="sm" loading={save.isPending} onClick={() => void onSave()}>
              Save
            </Button>
          </span>
        </CardFooter>
      )}
    </Card>
  );
}

/** True once the pasted certificate differs from the one whose summary we hold. */
function editingChanged(draft: SamlDraft, tenant: Tenant): boolean {
  return draft.certificate.trim() !== (tenant.saml.certificate ?? '').trim();
}
