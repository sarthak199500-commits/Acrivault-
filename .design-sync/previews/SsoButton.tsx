import type { ReactNode } from 'react';
import { SsoButton } from 'acrivault';

function Frame({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: 'var(--bg)', borderRadius: 'var(--r-md)', padding: 20, display: 'grid', gridTemplateColumns: 'repeat(2, 224px)', gap: 16 }}>
      {children}
    </div>
  );
}

function Cell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {children}
      <span style={{ fontSize: 'var(--fs-micro)', color: 'var(--text-tertiary)' }}>{label}</span>
    </div>
  );
}

/** The prominent "Continue with [IdP]" control — the primary sign-in path, with a
 *  provider mark. Loading sets aria-busy and disables; disabled dims the control. */
export function Providers() {
  return (
    <Frame>
      <Cell label="Entra"><SsoButton provider="entra" /></Cell>
      <Cell label="Okta"><SsoButton provider="okta" /></Cell>
      <Cell label="Loading"><SsoButton provider="entra" loading /></Cell>
      <Cell label="Disabled"><SsoButton provider="entra" disabled /></Cell>
    </Frame>
  );
}
