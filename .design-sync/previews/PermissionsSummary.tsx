import type { ReactNode } from 'react';
import { PermissionsSummary } from 'acrivault';

/* See Button.tsx for why scaffolding is inline-styled rather than class-based. */
function Frame({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: 'var(--bg)', borderRadius: 'var(--r-md)', padding: 20, maxWidth: 460 }}>
      {children}
    </div>
  );
}

/** Tenant Admin — the widest role. Every described capability is granted, so the
 *  "will not be able to" list is absent entirely rather than rendered empty. */
export function TenantAdmin() {
  return (
    <Frame>
      <PermissionsSummary role="tenant-admin" />
    </Frame>
  );
}

/** Security Admin — the security operator: full incident powers, no tenant or
 *  user administration. */
export function SecurityAdmin() {
  return (
    <Frame>
      <PermissionsSummary role="security-admin" />
    </Frame>
  );
}

/** Analyst — the mid role, and the clearest illustration of the split: a
 *  meaningful can-list above an equally meaningful cannot-list. */
export function Analyst() {
  return (
    <Frame>
      <PermissionsSummary role="analyst" />
    </Frame>
  );
}

/** Read-only / Auditor — the narrowest role, where the cannot-list dominates. */
export function Auditor() {
  return (
    <Frame>
      <PermissionsSummary role="viewer" />
    </Frame>
  );
}
