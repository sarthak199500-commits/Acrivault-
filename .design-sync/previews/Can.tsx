import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Can, Button, RoleRestricted, useUiStore } from 'acrivault';

/* Can renders its children only if the ACTIVE role holds the capability, else the
 * fallback. The active role comes from the ui store, whose default is tenant-admin
 * — which holds every capability, so nothing would ever fall back. To show both
 * branches honestly, this card pins the store role to security-admin on mount
 * (each preview card is its own document, so this is local to the card). */
function AsSecurityAdmin({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    useUiStore.getState().setRole('security-admin');
    setReady(true);
  }, []);
  if (!ready) return null;
  return <>{children}</>;
}

function Frame({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: 'var(--bg)', borderRadius: 'var(--r-md)', padding: 20, display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 420 }}>
      {children}
      <span style={{ fontSize: 'var(--fs-micro)', color: 'var(--text-tertiary)' }}>
        Viewing as Security Admin: policy actions render, user-management actions fall back to a read-only note.
      </span>
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <span style={{ fontSize: 'var(--fs-small)', color: 'var(--text-secondary)' }}>{label}</span>
      {children}
    </div>
  );
}

/** The allowed branch renders the control; the denied branch renders the fallback
 *  instead of a dead button. */
export function GatedActions() {
  return (
    <AsSecurityAdmin>
      <Frame>
        <Row label="Create policy">
          <Can capability="policy.create" fallback={<RoleRestricted inline note="Not permitted" />}>
            <Button size="sm">New policy</Button>
          </Can>
        </Row>
        <Row label="Delete user">
          <Can capability="users.delete" fallback={<RoleRestricted inline note="Tenant Admin only" />}>
            <Button size="sm" variant="danger">Delete</Button>
          </Can>
        </Row>
      </Frame>
    </AsSecurityAdmin>
  );
}
