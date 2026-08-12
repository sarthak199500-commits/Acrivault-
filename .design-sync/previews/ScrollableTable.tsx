import type { ReactNode } from 'react';
import { ScrollableTable, RiskPill, StatusBadge } from 'acrivault';

/* cardMode: column (config) so the full-width table gets a full card row. */
function Frame({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: 'var(--bg)', borderRadius: 'var(--r-md)', padding: 16 }}>
      {children}
    </div>
  );
}

const COLS = ['Identity', 'Type', 'Provider', 'Risk', 'Status', 'Last rotated'];
const ROWS = [
  ['payments-api@acrivault', 'Service account', 'AWS', 72, 'active', '12 days ago'],
  ['billing-worker@acrivault', 'API key', 'AWS', 41, 'active', '3 days ago'],
  ['nightly-export@acrivault', 'OAuth token', 'GCP', 18, 'active', '46 days ago'],
  ['legacy-cron@acrivault', 'Service account', 'Azure', 88, 'suspended', '512 days ago'],
] as const;

const th: React.CSSProperties = {
  textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.06em',
  fontSize: 'var(--fs-micro)', color: 'var(--text-tertiary)', fontWeight: 600,
  padding: '0 16px 8px', whiteSpace: 'nowrap',
};
const td: React.CSSProperties = {
  padding: '10px 16px', fontSize: 'var(--fs-small)', color: 'var(--text-secondary)',
  whiteSpace: 'nowrap', borderTop: '1px solid var(--border)',
};

/** The read-only, keyboard-focusable scroll region: a wide inventory table that
 *  overflows the card and scrolls horizontally. Focus the region and it shows an
 *  accent ring; it is exposed as role="region" with the given label. */
export function InventoryTable() {
  return (
    <Frame>
      <ScrollableTable label="Identity inventory">
        <table style={{ minWidth: 720, borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>{COLS.map((c) => <th key={c} style={th}>{c}</th>)}</tr>
          </thead>
          <tbody>
            {ROWS.map(([id, type, prov, risk, status, rotated]) => (
              <tr key={id as string}>
                <td style={{ ...td, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{id}</td>
                <td style={td}>{type}</td>
                <td style={td}>{prov}</td>
                <td style={td}><RiskPill score={risk as number} /></td>
                <td style={td}><StatusBadge status={status as 'active' | 'suspended'} /></td>
                <td style={{ ...td, fontVariantNumeric: 'tabular-nums' }}>{rotated}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollableTable>
    </Frame>
  );
}
