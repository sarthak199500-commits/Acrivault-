import type { ReactNode } from 'react';
import { Tabs, TabPanel, KeyValueList, Badge } from 'acrivault';

/* See Button.tsx for why scaffolding is inline-styled rather than class-based.
 * Tabs is controlled — `value` + `onValueChange` are required — so each cell
 * pins a different active tab with a no-op handler. */
function Frame({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: 'var(--bg)', borderRadius: 'var(--r-md)', padding: 20, maxWidth: 560 }}>
      {children}
    </div>
  );
}

function Body({ children }: { children: ReactNode }) {
  return (
    <div style={{ color: 'var(--text-secondary)', fontSize: 'var(--fs-small)', lineHeight: 1.6 }}>
      {children}
    </div>
  );
}

const IDENTITY_TABS = [
  { value: 'overview', label: 'Overview' },
  { value: 'permissions', label: 'Permissions' },
  { value: 'activity', label: 'Activity' },
];

/** The canonical identity-detail composition: the first tab active, with a real
 *  panel underneath. Only the active panel is mounted. */
export function Default() {
  return (
    <Frame>
      <Tabs value="overview" onValueChange={() => {}} tabs={IDENTITY_TABS}>
        <TabPanel value="overview">
          <KeyValueList
            items={[
              { label: 'Provider', value: 'AWS' },
              { label: 'Key ID', value: 'AKIA4RTQ2XN9PLZC', mono: true },
              { label: 'Owner', value: 'platform-billing' },
              { label: 'Last used', value: '2 hours ago' },
            ]}
          />
        </TabPanel>
      </Tabs>
    </Frame>
  );
}

/** A later tab active — the accent underline and primary text colour move to it
 *  while the inactive triggers drop back to secondary. */
export function MiddleTabActive() {
  return (
    <Frame>
      <Tabs value="permissions" onValueChange={() => {}} tabs={IDENTITY_TABS}>
        <TabPanel value="permissions">
          <Body>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span>s3:GetObject on arn:aws:s3:::acv-billing-exports/*</span>
              <span>secretsmanager:GetSecretValue on 4 secrets</span>
              <span>sts:AssumeRole on arn:aws:iam::4471:role/billing-reconciler</span>
            </div>
          </Body>
        </TabPanel>
      </Tabs>
    </Frame>
  );
}

/** Counts folded into the labels, as the Rotate screen does. Two tabs is the
 *  practical minimum — below that, drop the Tabs entirely. */
export function WithCounts() {
  return (
    <Frame>
      <Tabs
        value="active"
        onValueChange={() => {}}
        tabs={[
          { value: 'active', label: 'Active (3)' },
          { value: 'history', label: 'History (128)' },
        ]}
      >
        <TabPanel value="active">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              ['payments-api@acrivault', 'Propagate'],
              ['ci-deploy-runner@acrivault', 'Cutover'],
              ['metrics-shipper@acrivault', 'Verify'],
            ].map(([name, phase]) => (
              <div key={name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <span style={{ color: 'var(--text)', fontSize: 'var(--fs-small)' }}>{name}</span>
                <Badge tone="info">{phase}</Badge>
              </div>
            ))}
          </div>
        </TabPanel>
      </Tabs>
    </Frame>
  );
}

/** Five tabs — the upper end of what stays scannable on one line. Past this,
 *  reach for a sidebar or a Select rather than wrapping the tab list. */
export function ManyTabs() {
  return (
    <Frame>
      <Tabs
        value="blast"
        onValueChange={() => {}}
        tabs={[
          { value: 'overview', label: 'Overview' },
          { value: 'blast', label: 'Blast radius' },
          { value: 'sources', label: 'Sources' },
          { value: 'policies', label: 'Policies' },
          { value: 'activity', label: 'Activity' },
        ]}
      >
        <TabPanel value="blast">
          <Body>Reaches 14 resources across 3 accounts — 2 by direct grant, 9 transitively through billing-reconciler, and 3 by cascade through a readable secret.</Body>
        </TabPanel>
      </Tabs>
    </Frame>
  );
}
