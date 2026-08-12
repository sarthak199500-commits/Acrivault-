import type { ReactNode } from 'react';
import { StatusBadge } from 'acrivault';

/* See Button.tsx for why scaffolding is inline-styled rather than class-based. */
function Frame({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: 'var(--bg)', borderRadius: 'var(--r-md)', padding: 20, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
      {children}
    </div>
  );
}

/** Every UserStatus the system defines. The component owns the tone and the
 *  label — callers pass the raw status only, never a colour. */
export function AllStatuses() {
  return (
    <Frame>
      <StatusBadge status="invited" />
      <StatusBadge status="pending" />
      <StatusBadge status="active" />
      <StatusBadge status="suspended" />
      <StatusBadge status="deleted" />
    </Frame>
  );
}

/** In a user row — the badge's only real home (the admin Users table). */
export function InUserRow() {
  return (
    <div style={{ background: 'var(--bg)', borderRadius: 'var(--r-md)', padding: 20, display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 420 }}>
      {[
        { name: 'jordan.rivera@acrivault.io', role: 'Security Admin', status: 'active' as const },
        { name: 'sam.lee@acrivault.io', role: 'Analyst', status: 'invited' as const },
        { name: 'alex.kim@acrivault.io', role: 'Read-only / Auditor', status: 'suspended' as const },
      ].map((u) => (
        <div key={u.name} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
            <span style={{ fontSize: 'var(--fs-small)', color: 'var(--text)' }}>{u.name}</span>
            <span style={{ fontSize: 'var(--fs-micro)', color: 'var(--text-tertiary)' }}>{u.role}</span>
          </div>
          <span style={{ marginLeft: 'auto' }}><StatusBadge status={u.status} /></span>
        </div>
      ))}
    </div>
  );
}
