import type { ReactNode } from 'react';
import { AuthCard, SsoButton, Input, Button, RegistrationProgress } from 'acrivault';

/* AuthCard is the centered container the auth/registration screens render into:
 * an optional progress slot, an h1 title, a description, the body, and a footer.
 * Each preview card is its own document, so the singleton h1 is safe here. */
function Frame({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: 'var(--bg)', borderRadius: 'var(--r-md)', padding: 24, display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: 380 }}>{children}</div>
    </div>
  );
}

function Divider() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0' }}>
      <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      <span style={{ fontSize: 'var(--fs-micro)', color: 'var(--text-tertiary)' }}>OR</span>
      <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
    </div>
  );
}

/** A sign-in card: SSO as the prominent path, password as the secondary fallback,
 *  with a footer link. */
export function SignIn() {
  return (
    <Frame>
      <AuthCard
        title="Sign in to Acrivault"
        description="Use your organization identity provider to continue."
        footer={<span>New organization? <span style={{ color: 'var(--accent-text)' }}>Start registration</span>.</span>}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <SsoButton provider="entra" />
          <Divider />
          <Input placeholder="you@company.com" defaultValue="admin@northwind.example" />
          <Button>Continue with email</Button>
        </div>
      </AuthCard>
    </Frame>
  );
}

/** A registration step — the progress slot carries the stepper above the title. */
export function RegistrationStep() {
  return (
    <Frame>
      <AuthCard
        progress={<RegistrationProgress current={0} />}
        title="Create your account"
        description="This is the primary owner of the tenant."
        footer={<span>Already registered? <span style={{ color: 'var(--accent-text)' }}>Sign in</span>.</span>}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Input placeholder="Work email" defaultValue="admin@northwind.example" />
          <Input placeholder="Organization name" defaultValue="Northwind Security" />
          <Button>Continue</Button>
        </div>
      </AuthCard>
    </Frame>
  );
}
