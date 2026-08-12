import type { ReactNode } from 'react';
import { Sparkline } from 'acrivault';

/* Sparkline takes explicit width/height and an optional stroke — axis-free trend
 * lines for tiles and inline metrics. */
function Frame({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: 'var(--bg)', borderRadius: 'var(--r-md)', padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
      {children}
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <span style={{ minWidth: 120, fontSize: 'var(--fs-small)', color: 'var(--text-secondary)' }}>{label}</span>
      {children}
    </div>
  );
}

/** Rising vs. falling trends — pass a stroke to encode direction. Default stroke
 *  is the brand accent; a declining metric takes the risk-high tone. */
export function Trends() {
  return (
    <Frame>
      <Row label="Discovery ↑">
        <Sparkline values={[5, 6, 4, 7, 8, 6, 9, 11, 10, 12]} width={280} height={48} />
      </Row>
      <Row label="Stale keys ↓">
        <Sparkline values={[12, 9, 10, 7, 8, 6, 5, 4, 3, 2]} width={280} height={48} stroke="var(--risk-high)" />
      </Row>
    </Frame>
  );
}

/** Inline scale — the compact size that sits inside a KPI tile or a table cell. */
export function InlineSize() {
  return (
    <Frame>
      <Row label="96×28 (tile)">
        <Sparkline values={[3, 4, 3, 5, 6, 5, 7, 8]} width={96} height={28} />
      </Row>
      <Row label="140×32 (row)">
        <Sparkline values={[8, 6, 7, 5, 6, 4, 5, 3]} width={140} height={32} stroke="var(--cat-3)" />
      </Row>
    </Frame>
  );
}
