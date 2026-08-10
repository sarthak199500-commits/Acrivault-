import type { ReactNode } from 'react';
import { Card, CardHeader, CardBody, CardFooter, Badge, Button, KeyValueList } from 'acrivault';

/* See Button.tsx for why scaffolding is inline-styled rather than class-based. */
function Frame({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: 'var(--bg)', borderRadius: 'var(--r-md)', padding: 20, maxWidth: 520 }}>
      {children}
    </div>
  );
}

/** The canonical composition: header with an action, body, footer. */
export function Default() {
  return (
    <Frame>
      <Card>
        <CardHeader
          title="Payments API service account"
          description="Long-lived credential used by the billing worker."
          action={<Badge tone="warning">Rotation due</Badge>}
        />
        <CardBody>
          <KeyValueList
            items={[
              { label: 'Provider', value: 'AWS' },
              { label: 'Key ID', value: 'AKIA4RTQ2XN9PLZC', mono: true },
              { label: 'Last used', value: '2 hours ago' },
            ]}
          />
        </CardBody>
        <CardFooter>
          <Button size="sm">Rotate now</Button>
          <Button size="sm" variant="ghost">Dismiss</Button>
        </CardFooter>
      </Card>
    </Frame>
  );
}

/** Header only — the lightest useful form. */
export function HeaderOnly() {
  return (
    <Frame>
      <Card>
        <CardHeader title="Blast radius" description="Resources reachable by this identity." />
        <CardBody>
          <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--fs-body)' }}>
            14 resources across 3 accounts.
          </span>
        </CardBody>
      </Card>
    </Frame>
  );
}

/** `elevated` lifts the card off the page; `inset` removes body padding so the
 *  card can host a flush table or chart. */
export function Elevated() {
  return (
    <Frame>
      <Card elevated>
        <CardHeader title="Elevated" description="Raised surface for overlays and focused panels." />
        <CardBody>
          <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--fs-body)' }}>
            Uses the elevated shadow token.
          </span>
        </CardBody>
      </Card>
    </Frame>
  );
}
