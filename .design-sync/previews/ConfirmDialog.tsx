import { ConfirmDialog, KeyValueList } from 'acrivault';

/* ConfirmDialog renders through a portal, so it escapes any frame we'd wrap it
 * in and is captured with cardMode "single" (see cfg.overrides.ConfirmDialog).
 * It is driven open here — `open` is a controlled prop, and a closed dialog
 * renders nothing at all. */

/** The destructive confirmation: danger confirm, ghost cancel, and the blast
 *  radius stated in the body so the cost of the action is on screen. */
export function Default() {
  return (
    <ConfirmDialog
      open
      onOpenChange={() => {}}
      title="Revoke payments-api@acrivault?"
      description="The billing worker loses access the moment this is confirmed. Revocation cannot be undone."
      confirmLabel="Revoke access"
      cancelLabel="Keep credential"
      confirmVariant="danger"
      onConfirm={() => {}}
    >
      <KeyValueList
        items={[
          { label: 'Key ID', value: 'AKIA4RTQ2XN9PLZC', mono: true },
          { label: 'Blast radius', value: '14 resources · 3 accounts' },
          { label: 'Last used', value: '2 hours ago' },
        ]}
      />
    </ConfirmDialog>
  );
}
