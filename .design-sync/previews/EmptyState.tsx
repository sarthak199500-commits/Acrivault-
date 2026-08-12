import type { ReactNode } from 'react';
import { EmptyState, Button, Card } from 'acrivault';
import { ShieldAlert, FilterX, Sparkles } from 'lucide-react';

/* See Button.tsx for why scaffolding is inline-styled rather than class-based.
 * EmptyState centres itself and brings its own generous vertical padding, so
 * the frame only supplies the app background and a panel width. */
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

/** The full form, and the one to copy: a glyph in a tinted tile, a headline
 *  that names the absence, one line of guidance, and a single primary action
 *  that resolves it. This is the first-run inventory state. */
export function WithIconAndAction() {
  return (
    <Frame>
      <EmptyState
        icon={<ShieldAlert className="h-5 w-5" />}
        headline="No identities discovered yet"
        guidance="Connect a cloud to begin discovery. Acrivault will correlate identities across AWS, GCP, and Azure."
        action={<Button>Start onboarding</Button>}
      />
    </Frame>
  );
}

/** The filtered-to-nothing case — a different absence with a different fix.
 *  The action clears the filters rather than sending the user to onboarding,
 *  which is why copy matters more than layout on this component. */
export function NoResults() {
  return (
    <Frame>
      <EmptyState
        icon={<FilterX className="h-5 w-5" />}
        headline="No identities match these filters"
        guidance="Try removing a filter or clearing the search."
        action={<Button variant="secondary">Clear filters</Button>}
      />
    </Frame>
  );
}

/** No action: some absences resolve on their own and offering a button would
 *  be a lie. Sessions appear as agents act — there is nothing to click. */
export function WithoutAction() {
  return (
    <Frame>
      <EmptyState
        icon={<Sparkles className="h-5 w-5" />}
        headline="No sessions captured yet"
        guidance="As AI agents act, their sessions will appear here for review."
      />
    </Frame>
  );
}

/** Headline alone. `icon` and `guidance` are both optional and neither is
 *  defaulted, so this renders as a single centred line — the terse form used
 *  for not-found inside a detail panel. */
export function HeadlineOnly() {
  return (
    <Frame>
      <EmptyState headline="Identity not found" />
    </Frame>
  );
}

/** In place: dropped into a Card, which is how every list screen renders it.
 *  The card supplies the border and the component supplies the padding. */
export function InCard() {
  return (
    <Frame>
      <Card>
        <EmptyState
          icon={<ShieldAlert className="h-5 w-5" />}
          headline="No policies yet"
          guidance="Create your first policy to govern how identities are handled."
          action={<Button>Create a policy</Button>}
        />
      </Card>
    </Frame>
  );
}
