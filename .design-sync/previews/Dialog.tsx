import { Dialog, Button, KeyValueList } from 'acrivault';

/* Dialog renders through a portal, so it escapes any frame we'd wrap it in and
 * is captured with cardMode "single" (see cfg.overrides.Dialog). It is driven
 * open here — `open` is a controlled prop, and a closed dialog renders nothing. */

/** The canonical destructive confirmation. */
export function Default() {
  return (
    <Dialog
      open
      onOpenChange={() => {}}
      title="Revoke this credential?"
      description="The billing worker will lose access immediately. This cannot be undone."
      footer={
        <>
          <Button variant="ghost" size="sm">Cancel</Button>
          <Button variant="danger" size="sm">Revoke</Button>
        </>
      }
    >
      <KeyValueList
        items={[
          { label: 'Identity', value: 'payments-api@acrivault' },
          { label: 'Key ID', value: 'AKIA4RTQ2XN9PLZC', mono: true },
          { label: 'Blast radius', value: '14 resources' },
        ]}
      />
    </Dialog>
  );
}
