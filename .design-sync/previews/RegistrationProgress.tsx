import type { ReactNode } from 'react';
import { RegistrationProgress } from 'acrivault';

/* Narrow auth-card width — this indicator is sized to sit atop the registration
 * card, where a fully-labelled stepper would crowd. */
function Card({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: 'var(--bg)', borderRadius: 'var(--r-md)', padding: 20, display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 360 }}>
      {children}
    </div>
  );
}

function Step({ label, current }: { label: string; current: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <RegistrationProgress current={current} />
      <span style={{ fontSize: 'var(--fs-micro)', color: 'var(--text-tertiary)' }}>{label}</span>
    </div>
  );
}

/** The four registration steps swept — the filled segments and the
 *  "Step N of 4 — Label" caption advance together. */
export function Steps() {
  return (
    <Card>
      <Step label="First screen — Account" current={0} />
      <Step label="Third screen — Terms" current={2} />
      <Step label="Final screen — Secure" current={3} />
    </Card>
  );
}
