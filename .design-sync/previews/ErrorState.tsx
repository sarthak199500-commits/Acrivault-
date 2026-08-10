import type { ReactNode } from 'react';
import { ErrorState, Card } from 'acrivault';

/* See Button.tsx for why scaffolding is inline-styled rather than class-based.
 * ErrorState centres itself and brings its own vertical padding, so the frame
 * only supplies the app background and a panel width. */
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

/** The canonical failure: a critical-tinted warning tile, one plain sentence
 *  about what could not be loaded, and a secondary Try again. No stack trace,
 *  no error code in the user's face. */
export function Default() {
  return (
    <Frame>
      <ErrorState message="We couldn't load this identity." onRetry={() => {}} />
    </Frame>
  );
}

/** Passing `detail` adds a quiet "Technical detail" disclosure beside the
 *  retry. It is collapsed on mount — this cell shows the closed state, which
 *  is the only one a static capture can reach — and expands to a monospaced
 *  block on click. */
export function WithDetailToggle() {
  return (
    <Frame>
      <ErrorState
        message="We couldn't load the rotation job."
        detail="GET /api/v1/rotations/rot_8c21f4 → 503 Service Unavailable (upstream: aws-iam-connector)"
        onRetry={() => {}}
      />
    </Frame>
  );
}

/** Without `onRetry` the button is not rendered and the action row collapses
 *  to nothing. Use this when retrying genuinely cannot help. */
export function WithoutRetry() {
  return (
    <Frame>
      <ErrorState message="This session recording has expired and can no longer be replayed." />
    </Frame>
  );
}

/** In place: inside a Card, standing in for the table that failed to load.
 *  This is what QueryBoundary renders when the query rejects. */
export function InCard() {
  return (
    <Frame>
      <Card>
        <ErrorState
          message="We couldn't load the user directory."
          detail="NetworkError: fetch failed after 3 attempts"
          onRetry={() => {}}
        />
      </Card>
    </Frame>
  );
}
