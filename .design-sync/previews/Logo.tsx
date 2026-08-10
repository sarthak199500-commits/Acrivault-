import type { ReactNode } from 'react';
import { Logo } from 'acrivault';

/* The mark is painted with --logo-mark; the wordmark uses currentColor, so on a
 * dark frame it must inherit a light color — set on the Frame. */
function Frame({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: 'var(--bg)', color: 'var(--text-primary)', borderRadius: 'var(--r-md)', padding: 24, display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 40 }}>
      {children}
    </div>
  );
}

function Labeled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
      {children}
      <span style={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: 'var(--fs-micro)', color: 'var(--text-tertiary)' }}>{label}</span>
    </div>
  );
}

/** All three lockups. Horizontal for the top bar, stacked for auth screens, mark
 *  alone where space is tight. The wordmark follows the surrounding text color. */
export function Variants() {
  return (
    <Frame>
      <Labeled label="horizontal"><Logo variant="horizontal" /></Labeled>
      <Labeled label="stacked"><Logo variant="stacked" className="w-28" /></Labeled>
      <Labeled label="mark"><Logo variant="mark" className="h-8" /></Labeled>
    </Frame>
  );
}

/** The mark scales cleanly from a favicon to a hero lockup — it is pure vector. */
export function MarkSizes() {
  return (
    <Frame>
      <Logo variant="mark" className="h-5" />
      <Logo variant="mark" className="h-8" />
      <Logo variant="mark" className="h-12" />
      <Logo variant="mark" className="h-16" />
    </Frame>
  );
}
