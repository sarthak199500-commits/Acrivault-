import type { ReactNode } from 'react';
import { InlineAlert } from 'acrivault';

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
        gap: 12,
        maxWidth: 480,
      }}
    >
      {children}
    </div>
  );
}

/** The whole tone enum. Unlike Banner there is no fill or border — only the
 *  icon and the title take the tone colour, which is what keeps it quiet
 *  enough to sit inside a form. `success` exists here and not on Banner. */
export function Tones() {
  return (
    <Frame>
      <InlineAlert tone="info" title="Heads up.">
        Rotation runs during the maintenance window you selected.
      </InlineAlert>
      <InlineAlert tone="success" title="Saved.">
        The rotation schedule for billing-worker was updated.
      </InlineAlert>
      <InlineAlert tone="warning" title="Baseline learning.">
        This identity has 9 of 14 days of behaviour history — anomaly scores may be noisy.
      </InlineAlert>
      <InlineAlert tone="critical" title="Required.">
        Choose at least one AWS account before starting discovery.
      </InlineAlert>
    </Frame>
  );
}

/** Title omitted: the icon plus a single secondary-coloured sentence. This is
 *  the form-field footnote shape. */
export function MessageOnly() {
  return (
    <Frame>
      <InlineAlert tone="info">
        This user is suspended — role and group changes take effect when they&apos;re reactivated.
      </InlineAlert>
      <InlineAlert tone="warning">
        Revoking this key will break 3 workloads that authenticated with it in the last 24 hours.
      </InlineAlert>
    </Frame>
  );
}

/** Title only, no body: a terse status line where the tone carries the detail. */
export function TitleOnly() {
  return (
    <Frame>
      <InlineAlert tone="success" title="Connector verified." />
      <InlineAlert tone="critical" title="Key not found in AWS." />
    </Frame>
  );
}

/** How it reads in place — attached under a field label inside a form section,
 *  which is the case that separates it from Banner. */
export function InFormContext() {
  return (
    <Frame>
      <span
        style={{
          color: 'var(--text-secondary)',
          fontSize: 'var(--fs-small)',
          fontWeight: 500,
        }}
      >
        Rotation window
      </span>
      <div
        style={{
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-md)',
          padding: '8px 12px',
          color: 'var(--text-primary)',
          fontSize: 'var(--fs-body)',
          background: 'var(--surface)',
        }}
      >
        Sundays, 02:00–04:00 UTC
      </div>
      <InlineAlert tone="warning" title="Overlaps a change freeze.">
        The billing team has a freeze on the first Sunday of each month.
      </InlineAlert>
    </Frame>
  );
}
