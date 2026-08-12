import type { ReactNode } from 'react';
import { Badge } from 'acrivault';
import { Shield, GitBranch } from 'lucide-react';

/* Inline-styled scaffolding on var(--bg); see the house rule in NOTES.md. */
function Frame({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: 'var(--bg)', borderRadius: 'var(--r-md)', padding: 20, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
      {children}
    </div>
  );
}

/** The five semantic tones. Each ships as a bg/fg token pair; unlike RiskPill,
 *  Badge carries state and lifecycle, not a risk score. */
export function AllTones() {
  return (
    <Frame>
      <Badge tone="neutral">Neutral</Badge>
      <Badge tone="success">Governed</Badge>
      <Badge tone="warning">Drift</Badge>
      <Badge tone="critical">Orphaned</Badge>
      <Badge tone="info">Synthetic</Badge>
    </Frame>
  );
}

/** The `icon` slot takes a lucide glyph, rendered inline before the label. */
export function WithIcon() {
  return (
    <Frame>
      <Badge tone="success" icon={<Shield className="h-3 w-3" />}>Governed</Badge>
      <Badge tone="info" icon={<GitBranch className="h-3 w-3" />}>Terraform-managed</Badge>
      <Badge tone="warning" icon={<Shield className="h-3 w-3" />}>Policy drift</Badge>
    </Frame>
  );
}

/** How badges read against a real identity row — lifecycle state beside a name. */
export function InContext() {
  return (
    <div style={{ background: 'var(--bg)', borderRadius: 'var(--r-md)', padding: 20, display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 460 }}>
      {[
        { name: 'payments-api@acrivault', tone: 'success' as const, label: 'Governed' },
        { name: 'legacy-cron@acrivault', tone: 'critical' as const, label: 'Orphaned' },
        { name: 'analytics-token@acrivault', tone: 'warning' as const, label: 'Drift' },
      ].map((r) => (
        <div key={r.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-small)', color: 'var(--text-secondary)' }}>{r.name}</span>
          <Badge tone={r.tone}>{r.label}</Badge>
        </div>
      ))}
    </div>
  );
}
