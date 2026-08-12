import type { ReactNode } from 'react';
import { CloudGlyph } from 'acrivault';

/* See Button.tsx for why scaffolding is inline-styled rather than class-based. */
function Frame({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: 'var(--bg)', borderRadius: 'var(--r-md)', padding: 20, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
      {children}
    </div>
  );
}

/** The whole enum: AWS, GCP, AZ. All three are intentionally identical in
 *  treatment — monochrome mono-type chips — because colour in this console is
 *  reserved for risk. Only the abbreviation differs. */
export function AllClouds() {
  return (
    <Frame>
      <CloudGlyph cloud="aws" />
      <CloudGlyph cloud="gcp" />
      <CloudGlyph cloud="azure" />
    </Frame>
  );
}

/** In a dense table cell — the glyph's reason to exist. It marks the source
 *  provider without spending colour or horizontal space. */
export function InTableCell() {
  return (
    <div style={{ background: 'var(--bg)', borderRadius: 'var(--r-md)', padding: 20, display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 420 }}>
      {[
        { id: 'payments-api@acrivault', cloud: 'aws' as const, ext: '402913857761' },
        { id: 'analytics-export-sa', cloud: 'gcp' as const, ext: 'acrivault-prod' },
        { id: 'graph-sync-app', cloud: 'azure' as const, ext: 'corp.onmicrosoft.com' },
      ].map((r) => (
        <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CloudGlyph cloud={r.cloud} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-small)', color: 'var(--text)' }}>{r.id}</span>
          <span style={{ marginLeft: 'auto', fontSize: 'var(--fs-micro)', color: 'var(--text-tertiary)' }}>{r.ext}</span>
        </div>
      ))}
    </div>
  );
}

/** An identity federated across all three providers — glyphs cluster in one cell. */
export function MultiCloudIdentity() {
  return (
    <Frame>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-small)', color: 'var(--text)' }}>
        ci-deploy-bot
      </span>
      <span style={{ display: 'inline-flex', gap: 4 }}>
        <CloudGlyph cloud="aws" />
        <CloudGlyph cloud="gcp" />
        <CloudGlyph cloud="azure" />
      </span>
      <span style={{ fontSize: 'var(--fs-micro)', color: 'var(--text-tertiary)' }}>3 sources</span>
    </Frame>
  );
}
