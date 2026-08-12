import type { ReactNode } from 'react';
import { Skeleton, SkeletonText, SkeletonTableRows } from 'acrivault';

/* See Button.tsx for why scaffolding is inline-styled rather than class-based.
 *
 * Skeleton is the one exception: it has no size of its own and takes its
 * dimensions ENTIRELY from `className`, so the sizing utilities below are
 * real Tailwind classes rather than inline styles. Every class used here is
 * one the app itself already ships (they appear in
 * src/features/platform/design-system/FeedbackSection.tsx and in
 * Skeleton.tsx), so they are present in the compiled stylesheet. Do not
 * invent new utilities here — an unused-in-app class is absent from the CSS
 * and the block renders at zero height. */
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
        maxWidth: 460,
      }}
    >
      {children}
    </div>
  );
}

function Caption({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        color: 'var(--text-tertiary)',
        fontSize: 'var(--fs-micro)',
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        marginBottom: 6,
        display: 'block',
      }}
    >
      {children}
    </span>
  );
}

/** The primitive. One shimmering block that takes its whole size from
 *  `className` — a control, a card, an inline figure. Shape it like the
 *  content it stands in for. */
export function Blocks() {
  return (
    <Frame>
      <div>
        <Caption>Control · h-9 w-full</Caption>
        <Skeleton className="h-9 w-full" />
      </div>
      <div>
        <Caption>Card / panel · h-28 w-full</Caption>
        <Skeleton className="h-28 w-full" />
      </div>
      <div>
        <Caption>Inline figure · h-7 w-16</Caption>
        <Skeleton className="h-7 w-16" />
      </div>
    </Frame>
  );
}

/** `SkeletonText` stacks 3px-tall lines and shortens the last one to two
 *  thirds, so a loading paragraph has the ragged edge real prose does. */
export function Text() {
  return (
    <Frame>
      <div>
        <Caption>lines=3 (default)</Caption>
        <SkeletonText lines={3} />
      </div>
      <div>
        <Caption>lines=6 — a description block</Caption>
        <SkeletonText lines={6} />
      </div>
    </Frame>
  );
}

/** The composition pattern: a circle for the avatar plus two text lines,
 *  mirroring the identity row it replaces while the query resolves. */
export function AvatarAndText() {
  return (
    <Frame>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
        <div style={{ flex: 1 }}>
          <SkeletonText lines={2} />
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
        <div style={{ flex: 1 }}>
          <SkeletonText lines={2} />
        </div>
      </div>
    </Frame>
  );
}

/** KPI tiles use the `--size-kpi-tile` token for height, so the dashboard
 *  does not reflow when the real figures land. */
export function KpiTiles() {
  return (
    <Frame>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <Skeleton className="h-[var(--size-kpi-tile)] w-full" />
        <Skeleton className="h-[var(--size-kpi-tile)] w-full" />
        <Skeleton className="h-[var(--size-kpi-tile)] w-full" />
      </div>
    </Frame>
  );
}

/** `SkeletonTableRows` is the ready-made inventory placeholder — a wider
 *  first cell for the identity name, then even columns, hairline-divided.
 *  This is what QueryBoundary's `loadingFallback` renders on list screens. */
export function TableRows() {
  return (
    <Frame>
      <div
        style={{
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-lg)',
          overflow: 'hidden',
        }}
      >
        <SkeletonTableRows rows={5} cols={5} />
      </div>
    </Frame>
  );
}
