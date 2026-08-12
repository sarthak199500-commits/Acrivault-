import type { ReactNode } from 'react';
import { Breadcrumb } from 'acrivault';

/* See Button.tsx for why scaffolding is inline-styled rather than class-based.
 *
 * IN PRODUCT CODE, GIVE EVERY ANCESTOR CRUMB A `to` — that is the correct usage,
 * and what the doc prescribes. It is omitted here only because a crumb with `to`
 * renders a react-router <Link>, and preview cards mount without a Router
 * provider (no cfg.provider — see .design-sync/learnings/navigation.md), which
 * blanks the whole cell. The static render is the same either way: a `to`-less
 * non-last crumb and a <Link> both paint text-text-tertiary at the same size, so
 * these cards stay visually truthful — only the href and hover colour differ. */
function Frame({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: 'var(--bg)', borderRadius: 'var(--r-md)', padding: 20, maxWidth: 560 }}>
      {children}
    </div>
  );
}

/** The canonical detail-screen trail: two ancestors and the current record, which
 *  carries aria-current="page" and steps up to the primary text colour. */
export function Default() {
  return (
    <Frame>
      <Breadcrumb
        items={[{ label: 'Discover' }, { label: 'Identities' }, { label: 'agent-orchestrator-00412' }]}
      />
    </Frame>
  );
}

/** Two levels — the shortest useful trail, from a list screen to one record. */
export function TwoLevels() {
  return (
    <Frame>
      <Breadcrumb items={[{ label: 'Policies' }, { label: 'Max key age' }]} />
    </Frame>
  );
}

/** A four-level path down to a single rotation run — about as deep as the product
 *  goes. Ancestors stay muted so the current record still reads as the endpoint. */
export function DeepTrail() {
  return (
    <Frame>
      <Breadcrumb
        items={[
          { label: 'Protect' },
          { label: 'Rotation' },
          { label: 'payments-api@acrivault' },
          { label: 'Run 2291 · Propagate' },
        ]}
      />
    </Frame>
  );
}
