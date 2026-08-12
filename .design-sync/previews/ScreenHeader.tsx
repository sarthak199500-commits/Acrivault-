import type { ReactNode } from 'react';
import { ScreenHeader, Button } from 'acrivault';

/* Each preview card is its own document, so ScreenHeader's singleton
 * <h1 id="main-heading"> is safe here — the duplicate-id concern only applies
 * on a page that already renders one (the showcase page does). */
function Frame({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: 'var(--bg)', borderRadius: 'var(--r-md)', padding: 24, maxWidth: 720 }}>
      {children}
    </div>
  );
}

/** The standard top-of-screen header: eyebrow, display title, description, and a
 *  right-aligned actions slot. */
export function WithActions() {
  return (
    <Frame>
      <ScreenHeader
        eyebrow="Overview"
        title="Identity Inventory"
        description="Every non-human identity across your clouds, scored and correlated."
        actions={
          <>
            <Button variant="secondary" size="sm">Export</Button>
            <Button size="sm">Add source</Button>
          </>
        }
      />
    </Frame>
  );
}

/** Title-only — the actions and description slots are optional. */
export function TitleOnly() {
  return (
    <Frame>
      <ScreenHeader eyebrow="Platform" title="Settings" />
    </Frame>
  );
}
