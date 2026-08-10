import type { ReactNode } from 'react';
import { ThemeToggle, Logo } from 'acrivault';

/* ThemeToggle reads the ui store for the current theme and flips it on click.
 * A still capture shows the resting state (the icon for the *next* theme). The
 * store has no provider — it is module-level zustand — so it renders standalone. */
function TopBar({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: 'var(--bg)', borderRadius: 'var(--r-md)', padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '10px 14px' }}>
        <Logo variant="horizontal" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)' }}>{children}</div>
      </div>
      <span style={{ fontSize: 'var(--fs-micro)', color: 'var(--text-tertiary)' }}>
        Icon-button toggle — the glyph shows the theme it switches TO; clicking flips the whole console.
      </span>
    </div>
  );
}

/** The persistent theme control as it sits in the app top bar. */
export function InTopBar() {
  return (
    <TopBar>
      <ThemeToggle />
    </TopBar>
  );
}
