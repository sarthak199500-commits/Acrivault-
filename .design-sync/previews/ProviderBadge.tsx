import type { ReactNode } from 'react';
import { ProviderBadge, RiskPill } from 'acrivault';

/* See Button.tsx for why scaffolding is inline-styled rather than class-based. */
function Frame({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: 'var(--bg)', borderRadius: 'var(--r-md)', padding: 20, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
      {children}
    </div>
  );
}

/** The full Cloud enum. Each provider gets one categorical hue from the
 *  colourblind-aware palette, carried by the dot only — the label stays neutral
 *  so the text passes AA in both themes. */
export function AllProviders() {
  return (
    <Frame>
      <ProviderBadge cloud="aws" />
      <ProviderBadge cloud="azure" />
      <ProviderBadge cloud="gcp" />
    </Frame>
  );
}

/** As a legend — the hues here are the same ones the inventory graph and the
 *  provider filters use, which is why the badge spells the provider out. */
export function AsLegend() {
  return (
    <div style={{ background: 'var(--bg)', borderRadius: 'var(--r-md)', padding: 20, display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 320 }}>
      {[
        { cloud: 'aws' as const, count: '1,284 identities' },
        { cloud: 'azure' as const, count: '612 identities' },
        { cloud: 'gcp' as const, count: '347 identities' },
      ].map((r) => (
        <div key={r.cloud} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ProviderBadge cloud={r.cloud} />
          <span style={{ marginLeft: 'auto', fontSize: 'var(--fs-small)', color: 'var(--text-secondary)' }}>{r.count}</span>
        </div>
      ))}
    </div>
  );
}

/** In a detail panel beside a risk pill — shows the deliberate contrast between
 *  the badge's quiet categorical dot and the pill's loud severity colour. */
export function WithRisk() {
  return (
    <div style={{ background: 'var(--bg)', borderRadius: 'var(--r-md)', padding: 20, display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 440 }}>
      {[
        { id: 'payments-api@acrivault', cloud: 'aws' as const, score: 94 },
        { id: 'graph-sync-app', cloud: 'azure' as const, score: 58 },
        { id: 'analytics-export-sa', cloud: 'gcp' as const, score: 22 },
      ].map((r) => (
        <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ProviderBadge cloud={r.cloud} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-small)', color: 'var(--text)' }}>{r.id}</span>
          <span style={{ marginLeft: 'auto' }}><RiskPill score={r.score} size="sm" /></span>
        </div>
      ))}
    </div>
  );
}
