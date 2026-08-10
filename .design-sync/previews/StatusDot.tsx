import type { ReactNode } from 'react';
import { StatusDot } from 'acrivault';

/* See Button.tsx for why scaffolding is inline-styled rather than class-based. */
function Frame({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: 'var(--bg)', borderRadius: 'var(--r-md)', padding: 20, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16 }}>
      {children}
    </div>
  );
}

/* The dot is decorative (aria-hidden) and the component's own doc requires a
 * text label beside it, so every specimen here is the dot + its label — that
 * pairing IS the component's correct usage, not preview decoration. */
function Labeled({ children }: { children: ReactNode }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', fontSize: 'var(--fs-small)' }}>
      {children}
    </span>
  );
}

/** Every tone, each paired with the label that carries its meaning. */
export function Tones() {
  return (
    <Frame>
      <Labeled><StatusDot tone="ok" /> Connected</Labeled>
      <Labeled><StatusDot tone="warn" /> Degraded</Labeled>
      <Labeled><StatusDot tone="crit" /> Scan failed</Labeled>
      <Labeled><StatusDot tone="info" /> Syncing</Labeled>
      <Labeled><StatusDot tone="neutral" /> Not connected</Labeled>
    </Frame>
  );
}

/** `pulse` marks in-flight work. The halo is a motion-safe `animate-ping`, so it
 *  is a moving ring in the running app and NOT visible in a still capture — the
 *  first two dots below carry `pulse`, the third does not, and they are expected
 *  to look alike here. Use pulse only while something is actively running. */
export function Pulse() {
  return (
    <div style={{ background: 'var(--bg)', borderRadius: 'var(--r-md)', padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16 }}>
        <Labeled><StatusDot tone="warn" pulse /> Connecting to AWS</Labeled>
        <Labeled><StatusDot tone="info" pulse /> Discovery scan running</Labeled>
        <Labeled><StatusDot tone="ok" /> GCP connected</Labeled>
      </div>
      <span style={{ fontSize: 'var(--fs-micro)', color: 'var(--text-tertiary)' }}>
        First two use pulse — the ping ring animates in the app and does not appear in a still frame.
      </span>
    </div>
  );
}

/** Connector health in a list — the dot's primary home in the product. */
export function ConnectorHealth() {
  return (
    <div style={{ background: 'var(--bg)', borderRadius: 'var(--r-md)', padding: 20, display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 460 }}>
      {[
        { tone: 'ok' as const, name: 'aws-prod-402913857761', state: 'Healthy · scanned 6 min ago' },
        { tone: 'warn' as const, name: 'gcp-billing-exports', state: 'Throttled · retrying' },
        { tone: 'crit' as const, name: 'azure-tenant-corp', state: 'Credential expired' },
      ].map((row) => (
        <div key={row.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <StatusDot tone={row.tone} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-small)', color: 'var(--text)' }}>{row.name}</span>
          <span style={{ marginLeft: 'auto', fontSize: 'var(--fs-micro)', color: 'var(--text-tertiary)' }}>{row.state}</span>
        </div>
      ))}
    </div>
  );
}
