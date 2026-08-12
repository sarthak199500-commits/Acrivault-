import type { ReactNode } from 'react';
import { KeyValueList, StatusBadge } from 'acrivault';

/* See Button.tsx for why scaffolding is inline-styled rather than class-based. */
function Frame({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: 'var(--bg)', borderRadius: 'var(--r-md)', padding: 20, maxWidth: 480 }}>
      {children}
    </div>
  );
}

/** Identity metadata — the component's primary use in detail panels. */
export function Default() {
  return (
    <Frame>
      <KeyValueList
        items={[
          { label: 'Identity', value: 'payments-api@acrivault' },
          { label: 'Provider', value: 'AWS' },
          { label: 'Created', value: '14 Mar 2026' },
          { label: 'Last used', value: '2 hours ago' },
        ]}
      />
    </Frame>
  );
}

/** `mono` renders the value in JetBrains Mono — for keys, ARNs, and hashes. */
export function MonoValues() {
  return (
    <Frame>
      <KeyValueList
        items={[
          { label: 'Key ID', value: 'AKIA4RTQ2XN9PLZC', mono: true },
          { label: 'Role', value: 'role/billing-worker', mono: true },
          { label: 'Fingerprint', value: 'SHA256:9f2a4c8e1b7d3056', mono: true },
        ]}
      />
    </Frame>
  );
}

/** `boxed` frames the list on its own surface; `derived` marks values Acrivault
 *  inferred rather than read directly from the provider. */
export function BoxedWithDerived() {
  return (
    <Frame>
      <KeyValueList
        boxed
        items={[
          { label: 'Status', value: <StatusBadge status="active" /> },
          { label: 'Risk score', value: '72 / 100', derived: true },
          { label: 'Owner', value: 'platform-team', derived: true },
        ]}
      />
    </Frame>
  );
}
