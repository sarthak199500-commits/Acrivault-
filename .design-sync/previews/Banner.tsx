import type { ReactNode } from 'react';
import { Banner, Button } from 'acrivault';
import { KeyRound } from 'lucide-react';

/* See Button.tsx for why scaffolding is inline-styled rather than class-based.
 * Banner is a full-bleed page-level block, so cells stack in a column and
 * stretch. */
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
        maxWidth: 560,
      }}
    >
      {children}
    </div>
  );
}

/** The whole tone enum. Each tone pairs a fill, a border, and its own icon —
 *  colour is never the only signal. `critical` also switches role to alert. */
export function Tones() {
  return (
    <Frame>
      <Banner tone="info">
        Discovery runs hourly. Identities found in the last scan appear within a few minutes.
      </Banner>
      <Banner tone="warning">
        4 credentials in <strong>acme-prod</strong> are past their 90-day rotation window.
      </Banner>
      <Banner tone="critical">
        Rotation failed for payments-api@acrivault — the old key is still live.
      </Banner>
    </Frame>
  );
}

/** `action` pins a control to the trailing edge. The standard pairing is a
 *  small secondary button on a critical banner that reports a failed fetch. */
export function WithAction() {
  return (
    <Frame>
      <Banner
        tone="critical"
        action={<Button variant="secondary" size="sm">Retry</Button>}
      >
        We couldn&apos;t load the user directory.
      </Banner>
      <Banner
        tone="warning"
        action={<Button variant="secondary" size="sm">Review</Button>}
      >
        GCP connector last succeeded 6 days ago.
      </Banner>
    </Frame>
  );
}

/** `icon` replaces the tone's default glyph when a more specific one reads
 *  better — here a key, because the message is about credential material. */
export function CustomIcon() {
  return (
    <Frame>
      <Banner tone="info" icon={<KeyRound className="h-4 w-4" />}>
        This credential is managed by Acrivault. Rotating it outside the console will be detected
        and flagged as drift.
      </Banner>
    </Frame>
  );
}

/** Long copy wraps inside the banner and keeps the icon top-aligned, so a
 *  multi-sentence policy note stays readable at page width. */
export function LongMessage() {
  return (
    <Frame>
      <Banner tone="warning">
        Group management is intentionally minimal in this build. Nested groups and group-level
        policy assignment are still open questions — assign policies to individual identities
        until that lands.
      </Banner>
    </Frame>
  );
}
