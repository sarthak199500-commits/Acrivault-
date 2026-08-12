import type { ReactNode } from 'react';
import { RiskPill } from 'acrivault';

/* See Button.tsx for why scaffolding is inline-styled rather than class-based. */
function Frame({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: 'var(--bg)', borderRadius: 'var(--r-md)', padding: 20, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
      {children}
    </div>
  );
}

/** All five bands, driven by score. The caller never picks a band or a colour —
 *  it passes a precomputed 0..100 score and lib/risk.ts maps it. */
export function AllBands() {
  return (
    <Frame>
      <RiskPill score={94} />
      <RiskPill score={71} />
      <RiskPill score={52} />
      <RiskPill score={28} />
      <RiskPill score={7} />
    </Frame>
  );
}

/** `sm` is the table-row size; `md` is the default for detail headers. The two
 *  differ only in horizontal padding — type size is shared — so they are
 *  captioned here to make a deliberately subtle axis legible. */
export function Sizes() {
  return (
    <Frame>
      {(['sm', 'md'] as const).map((size) => (
        <div key={size} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
          <span style={{ fontSize: 'var(--fs-micro)', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
            size="{size}"
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <RiskPill score={94} size={size} />
            <RiskPill score={28} size={size} />
          </div>
        </div>
      ))}
    </Frame>
  );
}

/** `showScore={false}` drops the number and leaves the band label + direction
 *  glyph — for dense surfaces where the exact score is shown elsewhere. */
export function LabelOnly() {
  return (
    <Frame>
      <RiskPill score={94} showScore={false} />
      <RiskPill score={71} showScore={false} />
      <RiskPill score={52} showScore={false} />
      <RiskPill score={28} showScore={false} />
      <RiskPill score={7} showScore={false} />
    </Frame>
  );
}

/** In an inventory row — the pill sits in a fixed column so scores align. */
export function InInventoryRow() {
  return (
    <div style={{ background: 'var(--bg)', borderRadius: 'var(--r-md)', padding: 20, display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 440 }}>
      {[
        { id: 'payments-api@acrivault', score: 94 },
        { id: 'billing-worker-role', score: 66 },
        { id: 'analytics-export-sa', score: 41 },
        { id: 'readonly-audit-token', score: 12 },
      ].map((r) => (
        <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-small)', color: 'var(--text)' }}>{r.id}</span>
          <span style={{ marginLeft: 'auto' }}><RiskPill score={r.score} size="sm" /></span>
        </div>
      ))}
    </div>
  );
}
