import { useEffect } from 'react';
import { Toaster, toast } from 'acrivault';

/* Toaster renders the toast queue from the ui toast store; it shows nothing until
 * a toast is pushed. `toast()` is re-exported from the bundle (added to the entry
 * barrel) so the preview and the Toaster share ONE store instance — a copy bundled
 * into the preview would push into a different store and nothing would appear.
 *
 * cardMode "single" + a 640x400 viewport (config) give the fixed bottom-center
 * viewport room to show the stacked toasts. */
function Seeded() {
  useEffect(() => {
    toast('Rotation complete', { description: 'payments-api credentials rotated successfully.', tone: 'success' });
    toast('Policy drift detected', { description: '3 identities now exceed their granted scope.', tone: 'warning' });
    toast('Discovery scan failed', { description: 'Could not reach the GCP connector.', tone: 'critical' });
  }, []);
  return <Toaster />;
}

/** Three stacked toasts — success, warning, and critical tones — as they appear
 *  in the fixed bottom-center viewport. Each carries a title, description, and a
 *  dismiss control. */
export function Stacked() {
  return <Seeded />;
}
