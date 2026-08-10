import { Drawer, Button, KeyValueList, Badge, RiskPill } from 'acrivault';

/* Drawer renders through a portal, so it escapes any frame we'd wrap it in and
 * is captured with cardMode "single" (see cfg.overrides.Drawer). It is driven
 * open here — `open` is a controlled prop, and a closed drawer renders nothing. */

/** The identity-detail side panel: header with title, description and close
 *  affordance, a scrollable body, and a pinned footer of actions. */
export function Default() {
  return (
    <Drawer
      open
      onOpenChange={() => {}}
      title="payments-api@acrivault"
      description="AWS access key · owned by platform-billing"
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button size="sm" variant="ghost">Close</Button>
          <Button size="sm">Rotate now</Button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <RiskPill score={82} />
          <Badge tone="warning">Rotation due</Badge>
        </div>
        <KeyValueList
          items={[
            { label: 'Key ID', value: 'AKIA4RTQ2XN9PLZC', mono: true },
            { label: 'Created', value: '128 days ago' },
            { label: 'Last used', value: '2 hours ago' },
            { label: 'Blast radius', value: '14 resources · 3 accounts' },
            { label: 'Rotation window', value: 'Sun 02:00–04:00 UTC' },
          ]}
        />
        <div style={{ color: 'var(--text-secondary)', fontSize: 'var(--fs-small)', lineHeight: 1.6 }}>
          Exceeds the 90-day max key age policy by 38 days. One standing exception raises
          the ceiling to 120 days for this service account.
        </div>
      </div>
    </Drawer>
  );
}
