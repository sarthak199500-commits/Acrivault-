import type { ReactNode } from 'react';
import { Textarea } from 'acrivault';

/* See Button.tsx for why scaffolding is inline-styled rather than class-based. */
function Frame({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        background: 'var(--bg)',
        borderRadius: 'var(--r-md)',
        padding: 20,
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'flex-start',
        gap: 20,
      }}
    >
      {children}
    </div>
  );
}

function Col({ children }: { children: ReactNode }) {
  return <div style={{ width: 300 }}>{children}</div>;
}

/** Label, field, hint — the canonical multi-line field. Minimum height is five
 *  rows so an empty textarea still reads as "write a paragraph here". */
export function Default() {
  return (
    <Frame>
      <Col>
        <Textarea
          label="Rotation notes"
          hint="Visible to anyone with access to this identity."
          placeholder="Why is this credential being rotated?"
        />
      </Col>
      <Col>
        <Textarea
          label="Exception justification"
          defaultValue="Vendor SDK pins this key until the Q3 upgrade lands. Owner: platform-team. Re-review 30 Sep 2026."
        />
      </Col>
    </Frame>
  );
}

/** `showCount` with `maxLength` renders a live counter in the footer row,
 *  opposite the hint. The count starts from the mounted value, not zero. */
export function WithCharacterCount() {
  return (
    <Frame>
      <Col>
        <Textarea
          label="Approval note"
          hint="Up to 200 characters."
          maxLength={200}
          showCount
          defaultValue="Approved under the standing break-glass policy; access expires with the incident window."
        />
      </Col>
      <Col>
        <Textarea label="Handover context" hint="Up to 200 characters." maxLength={200} showCount placeholder="Add context…" />
      </Col>
    </Frame>
  );
}

/** `error` replaces the hint, turns the border critical, and sets aria-invalid.
 *  It shares the footer row with the counter, so both can show at once. */
export function ErrorState() {
  return (
    <Frame>
      <Col>
        <Textarea
          label="Exception justification"
          error="A justification is required to suppress a critical finding."
          placeholder="Explain why this finding is being suppressed…"
        />
      </Col>
      <Col>
        <Textarea
          label="Approval note"
          error="Approval notes must reference a change ticket."
          maxLength={200}
          showCount
          defaultValue="Approved by the platform on-call after reviewing the blast radius report for AKIA4RTQ2XN9PLZC."
        />
      </Col>
    </Frame>
  );
}
