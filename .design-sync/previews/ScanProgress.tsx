import type { ReactNode } from 'react';
import { ScanProgress, NhiTypeIcon } from 'acrivault';

/* See Button.tsx for why scaffolding is inline-styled rather than class-based. */
function Frame({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        background: 'var(--bg)',
        borderRadius: 'var(--r-md)',
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        maxWidth: 520,
      }}
    >
      {children}
    </div>
  );
}

/** Onboarding's discovery scan mid-flight. `scanning` swaps the eyebrow to
 *  "Discovering…" and sets aria-busy on the live region; the total is the sum
 *  of the row values, not of the row totals. */
export function Scanning() {
  return (
    <Frame>
      <ScanProgress
        scanning
        rows={[
          { id: 'ai-agent', label: 'AI Agent', icon: <NhiTypeIcon type="ai-agent" className="h-4 w-4" />, value: 412, total: 500 },
          { id: 'service-account', label: 'Service Account', icon: <NhiTypeIcon type="service-account" className="h-4 w-4" />, value: 318, total: 400 },
          { id: 'api-key', label: 'API Key', icon: <NhiTypeIcon type="api-key" className="h-4 w-4" />, value: 221, total: 300 },
          { id: 'oauth-token', label: 'OAuth Token', icon: <NhiTypeIcon type="oauth-token" className="h-4 w-4" />, value: 164, total: 220 },
          { id: 'workload-identity', label: 'Workload Identity', icon: <NhiTypeIcon type="workload-identity" className="h-4 w-4" />, value: 96, total: 140 },
        ]}
      />
    </Frame>
  );
}

/** The settled state: `scanning` omitted, every row at its total, eyebrow
 *  reads "Discovered". This is what the onboarding step leaves on screen. */
export function Complete() {
  return (
    <Frame>
      <ScanProgress
        rows={[
          { id: 'ai-agent', label: 'AI Agent', icon: <NhiTypeIcon type="ai-agent" className="h-4 w-4" />, value: 500, total: 500 },
          { id: 'service-account', label: 'Service Account', icon: <NhiTypeIcon type="service-account" className="h-4 w-4" />, value: 400, total: 400 },
          { id: 'api-key', label: 'API Key', icon: <NhiTypeIcon type="api-key" className="h-4 w-4" />, value: 300, total: 300 },
          { id: 'oauth-token', label: 'OAuth Token', icon: <NhiTypeIcon type="oauth-token" className="h-4 w-4" />, value: 220, total: 220 },
          { id: 'workload-identity', label: 'Workload Identity', icon: <NhiTypeIcon type="workload-identity" className="h-4 w-4" />, value: 140, total: 140 },
        ]}
      />
    </Frame>
  );
}

/** Rows are free-form, so the same component reports a per-account scan.
 *  Icons are optional — the label column simply loses its glyph. */
export function ByAccount() {
  return (
    <Frame>
      <ScanProgress
        scanning
        rows={[
          { id: 'acme-prod', label: 'acme-prod (AWS)', value: 1284, total: 1600 },
          { id: 'acme-staging', label: 'acme-staging (AWS)', value: 431, total: 470 },
          { id: 'acme-data', label: 'acme-data (GCP)', value: 208, total: 610 },
          { id: 'acme-corp', label: 'acme-corp (Azure)', value: 57, total: 340 },
        ]}
      />
    </Frame>
  );
}
