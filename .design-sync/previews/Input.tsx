import type { ReactNode } from 'react';
import { Input } from 'acrivault';
import { Search, KeyRound } from 'lucide-react';

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
  return <div style={{ width: 260 }}>{children}</div>;
}

/** Label above, field below — the canonical form field. */
export function Default() {
  return (
    <Frame>
      <Col>
        <Input label="Identity name" placeholder="payments-api" />
      </Col>
      <Col>
        <Input label="Service account" defaultValue="payments-api@acrivault" />
      </Col>
    </Frame>
  );
}

/** `hint` sits under the field in tertiary text; `error` replaces it, turns the
 *  border critical, and gets role=alert. Only one of the two ever renders. */
export function HintAndError() {
  return (
    <Frame>
      <Col>
        <Input
          label="Rotation window (days)"
          defaultValue="90"
          hint="Credentials older than this are flagged for rotation."
        />
      </Col>
      <Col>
        <Input
          label="AWS access key ID"
          defaultValue="AKIA-short"
          error="Access key IDs are 20 characters."
        />
      </Col>
    </Frame>
  );
}

/** The `prefix` and `suffix` slots take icons or units. Prefix is aria-hidden —
 *  it decorates, it never carries meaning the label does not already give. */
export function WithAffixes() {
  return (
    <Frame>
      <Col>
        <Input label="Search identities" hideLabel prefix={<Search className="h-4 w-4" />} placeholder="Search identities…" />
      </Col>
      <Col>
        <Input label="Key fingerprint" prefix={<KeyRound className="h-4 w-4" />} defaultValue="SHA256:9f2a4c8e" />
      </Col>
      <Col>
        <Input label="Max age" defaultValue="90" suffix={<span style={{ fontSize: 'var(--fs-small)' }}>days</span>} />
      </Col>
    </Frame>
  );
}

/** `hideLabel` keeps the label for assistive tech only — for toolbar fields
 *  where a visible label would be redundant.
 *
 *  Disabled has no first-class styling yet: the native input stops accepting
 *  input but the bordered shell does not dim, so callers wrap the field in a
 *  reduced opacity the way the design-system page does. Reproduced here so the
 *  card shows what the product actually renders. */
export function HiddenLabelAndDisabled() {
  return (
    <Frame>
      <Col>
        <Input label="Filter by owner" hideLabel placeholder="Filter by owner…" />
      </Col>
      <Col>
        <div style={{ opacity: 0.6 }}>
          <Input label="Provider account" defaultValue="402913857761" disabled />
        </div>
      </Col>
    </Frame>
  );
}
