import type { ReactNode } from 'react';
import { RoleRestricted } from 'acrivault';

/* RoleRestricted is the standard "you may see this but not act" presentation —
 * a quiet note in place of a dead control. `inline` switches between a block note
 * and an inline lock+text. An explicit `note` overrides the default role message. */
function Frame({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: 'var(--bg)', borderRadius: 'var(--r-md)', padding: 20, display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 460 }}>
      {children}
    </div>
  );
}

function Labeled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: 'var(--fs-micro)', color: 'var(--text-tertiary)' }}>{label}</span>
      {children}
    </div>
  );
}

/** Block and inline forms. The block note replaces a whole action area; the inline
 *  form sits at the end of a row where a control would be. */
export function Variants() {
  return (
    <Frame>
      <Labeled label="Block">
        <RoleRestricted note="Analyst has read-only access to rotation. Ask a Security Admin to run this." />
      </Labeled>
      <Labeled label="Inline">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, color: 'var(--text-primary)' }}>
          <span style={{ fontSize: 'var(--fs-small)', color: 'var(--text-secondary)' }}>Rotate credentials</span>
          <RoleRestricted inline note="Read-only" />
        </div>
      </Labeled>
    </Frame>
  );
}
