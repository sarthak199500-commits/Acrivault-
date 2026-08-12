import type { ReactNode } from 'react';
import { ProgressBar } from 'acrivault';

/* See Button.tsx for why scaffolding is inline-styled rather than class-based.
 * ProgressBar is a full-width block, so cells stack and stretch. */
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
        gap: 16,
        maxWidth: 420,
      }}
    >
      {children}
    </div>
  );
}

/** The canonical determinate bar: a label on the left and the rounded
 *  percentage on the right, both rendered only because `label` was passed. */
export function Default() {
  return (
    <Frame>
      <ProgressBar value={64} label="Rotating 41 of 64 credentials" />
    </Frame>
  );
}

/** The tone enum. Tone is the fill colour only — the track stays surface-2 —
 *  so it reads as severity, not as a different component. */
export function Tones() {
  return (
    <Frame>
      <ProgressBar value={42} label="Rotation progress" />
      <ProgressBar value={100} tone="success" label="acme-prod scan complete" />
      <ProgressBar value={30} tone="warning" label="Baseline · day 9 of 14" />
      <ProgressBar value={86} tone="critical" label="API quota — 86% of 500k/day" />
    </Frame>
  );
}

/** Both sizes. `sm` is the 6px track used inside dense rows such as
 *  ScanProgress; `md` is the 8px default for standalone progress. */
export function Sizes() {
  return (
    <Frame>
      <ProgressBar value={58} label="Default (md)" />
      <ProgressBar value={58} size="sm" label="Compact (sm)" />
    </Frame>
  );
}

/** Omitting `value` switches to indeterminate: the fill becomes a one-third
 *  sliver that sweeps the track, and the percentage disappears from the label
 *  because there is no figure to report. Frozen mid-sweep in this capture. */
export function Indeterminate() {
  return (
    <Frame>
      <ProgressBar label="Enumerating IAM roles in us-east-1…" />
      <ProgressBar tone="warning" label="Waiting on GCP connector…" />
    </Frame>
  );
}

/** Without `label` the header row is not rendered at all — just the track.
 *  Use this when the surrounding row already names the work. */
export function WithoutLabel() {
  return (
    <Frame>
      <ProgressBar value={72} />
      <ProgressBar value={38} tone="warning" size="sm" />
    </Frame>
  );
}
