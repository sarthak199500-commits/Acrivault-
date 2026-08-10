import type { ReactNode } from 'react';
import { DensityToggle, ThemeToggle } from 'acrivault';

/* DensityToggle switches the console's row rhythm (comfortable ↔ compact) by
 * setting data-density, which re-scales --row-py / --cell-px globally. It reads
 * the module-level ui store, so it renders standalone. */
function Frame({ children, caption }: { children: ReactNode; caption: string }) {
  return (
    <div style={{ background: 'var(--bg)', borderRadius: 'var(--r-md)', padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '10px 14px', color: 'var(--text-primary)', width: 'fit-content' }}>
        {children}
      </div>
      <span style={{ fontSize: 'var(--fs-micro)', color: 'var(--text-tertiary)' }}>{caption}</span>
    </div>
  );
}

/** The density control beside its top-bar sibling — the pair of view toggles. */
export function InTopBar() {
  return (
    <Frame caption="Comfortable / compact — re-scales row height across every data table at once.">
      <DensityToggle />
      <ThemeToggle />
    </Frame>
  );
}
