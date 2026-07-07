import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, KeyRound } from 'lucide-react';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card, CardBody, CardHeader, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { Banner } from '@/components/ui/Banner';
import { RoleRestricted } from '@/components/ui/RoleRestricted';
import { useCan } from '@/components/ui/Can';
import { cn } from '@/lib/cn';
import { toast } from '@/stores/toast';

type Protocol = 'saml' | 'oidc';

export function SsoScreen() {
  const navigate = useNavigate();
  const canManage = useCan('sso.manage');
  const [enabled, setEnabled] = useState(false);
  const [protocol, setProtocol] = useState<Protocol>('saml');
  const [fallback, setFallback] = useState(true);
  const [saving, setSaving] = useState(false);

  const disabled = !canManage;

  const save = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast('Sign-in settings saved', { tone: 'success', description: 'Synthetic — no real IdP configured.' });
    }, 700);
  };

  return (
    <div className="mx-auto max-w-2xl">
      <ScreenHeader
        eyebrow="Platform · Settings"
        title="Sign-in & SSO"
        description="Configure SAML or OIDC single sign-on with an optional password fallback."
        actions={
          <Button variant="ghost" size="sm" leadingIcon={<ChevronLeft className="h-4 w-4" />} onClick={() => navigate('/settings')}>
            Settings
          </Button>
        }
      />

      <Banner tone="info" className="mb-4">
        {/* ASSUMPTION: whether SSO ships now or later for design partners is open (Founder & Architect). */}
        Timing is still open — whether SSO ships for design partners now or later is a Founder/Architect decision. This screen is built ahead of that call.
      </Banner>

      {disabled && (
        <div className="mb-4">
          <RoleRestricted note="Only a Security Admin can configure sign-in & SSO. You can view the current settings." />
        </div>
      )}

      <Card>
        <CardHeader title="Single sign-on" action={<Switch checked={enabled} onCheckedChange={setEnabled} disabled={disabled} ariaLabel="Enable single sign-on" />} />
        <CardBody className={cn('space-y-4', !enabled && 'opacity-60')}>
          <div>
            <span className="mb-1.5 block text-[length:var(--fs-small)] font-medium text-text-secondary">Protocol</span>
            <div className="inline-flex rounded-[var(--r-sm)] border border-border-strong p-0.5">
              {(['saml', 'oidc'] as Protocol[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  disabled={disabled || !enabled}
                  aria-pressed={protocol === p}
                  onClick={() => setProtocol(p)}
                  className={cn(
                    'rounded-[var(--r-xs)] px-3 py-1 text-[length:var(--fs-small)] uppercase transition-colors disabled:cursor-not-allowed',
                    protocol === p ? 'bg-accent-tint text-accent-text' : 'text-text-secondary hover:text-text',
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {protocol === 'saml' ? (
            <>
              <Input label="Entity ID" placeholder="urn:acme:acrivault" disabled={disabled || !enabled} />
              <Input label="ACS URL" placeholder="https://idp.example.com/acs" disabled={disabled || !enabled} />
            </>
          ) : (
            <>
              <Input label="Issuer URL" placeholder="https://idp.example.com" disabled={disabled || !enabled} />
              <Input label="Client ID" placeholder="acrivault-oidc" disabled={disabled || !enabled} />
            </>
          )}

          <label className="flex items-center justify-between rounded-[var(--r-md)] border border-border bg-surface-2 px-3 py-2.5">
            <span className="min-w-0">
              <span className="block text-[length:var(--fs-small)] font-medium text-text">Allow password fallback</span>
              <span className="block text-[length:var(--fs-micro)] text-text-tertiary">Let users sign in with a password if the IdP is unavailable.</span>
            </span>
            <Switch checked={fallback} onCheckedChange={setFallback} disabled={disabled || !enabled} ariaLabel="Allow password fallback" />
          </label>
        </CardBody>
        {!disabled && (
          <CardFooter className="justify-end">
            <Button leadingIcon={<KeyRound className="h-4 w-4" />} loading={saving} onClick={save}>Save settings</Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
