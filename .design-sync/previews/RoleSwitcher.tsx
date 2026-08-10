import type { ReactNode } from 'react';
import { RoleSwitcher, ThemeToggle, DensityToggle } from 'acrivault';

/* RoleSwitcher is a labeled dropdown trigger showing the current viewing role
 * (from the ui store). The menu opens on click and cannot appear in a still
 * capture, so this shows the closed trigger — its resting, in-bar appearance.
 * The store is module-level zustand, so no provider is needed. */
function TopBar({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: 'var(--bg)', borderRadius: 'var(--r-md)', padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '10px 14px', color: 'var(--text-primary)', width: 'fit-content' }}>
        {children}
      </div>
      <span style={{ fontSize: 'var(--fs-micro)', color: 'var(--text-tertiary)' }}>
        Closed trigger — clicking opens a labeled menu of roles (tenant-admin / security-admin / analyst / read-only). The whole console re-scopes to the chosen role.
      </span>
    </div>
  );
}

/** The role switcher as it sits in the top bar, beside the view toggles. */
export function InTopBar() {
  return (
    <TopBar>
      <RoleSwitcher />
      <ThemeToggle />
      <DensityToggle />
    </TopBar>
  );
}
