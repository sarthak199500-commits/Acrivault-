import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { InlineAlert } from '@/components/ui/InlineAlert';
import { EntraChip } from './parts';

/**
 * The token is shown in full exactly once. Nothing reads it back afterwards, so
 * the dialog cannot be dismissed by accident: closing it requires saying that the
 * value is already in Entra. Re-issuing is the only recovery, and it revokes the
 * token Entra currently holds.
 */
export function TokenRevealDialog({
  token,
  onClose,
}: {
  token: string | null;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  const copy = async () => {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable — the value is selectable on screen */
    }
  };

  const close = () => {
    setCopied(false);
    setAcknowledged(false);
    onClose();
  };

  return (
    <Dialog
      open={token !== null}
      // Dismissing by scrim or Escape would lose the value silently.
      onOpenChange={(open) => {
        if (!open && acknowledged) close();
      }}
      size="md"
      title="Copy this token now"
      description="This is the only time Acrivault can show it to you."
      footer={
        <Button disabled={!acknowledged} onClick={close}>
          Done
        </Button>
      }
    >
      <div className="space-y-4">
        <div>
          <div className="mb-1 text-[length:var(--fs-small)] font-medium text-text-secondary">
            Secret token
          </div>
          <div className="flex items-start gap-2">
            <code className="min-w-0 flex-1 break-all rounded-[var(--r-sm)] border border-border bg-surface-2 px-2.5 py-2 font-mono text-[length:var(--fs-small)] text-text">
              {token}
            </code>
            <Button
              size="sm"
              variant="secondary"
              leadingIcon={copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              onClick={() => void copy()}
            >
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
        </div>

        <p className="text-[length:var(--fs-small)] text-text-secondary">
          Paste it into Entra’s <EntraChip>Secret token</EntraChip> under the provisioning
          credentials, then press <EntraChip>Test connection</EntraChip>.
        </p>

        <InlineAlert tone="warning" title="Any previous token is now revoked.">
          Provisioning stays down until Entra is authenticating with this one.
        </InlineAlert>

        <label className="flex cursor-pointer items-start gap-2.5 rounded-[var(--r-md)] border border-border bg-surface-2 px-3 py-2.5">
          <Checkbox
            checked={acknowledged}
            onCheckedChange={setAcknowledged}
            aria-label="I have pasted this token into Entra"
            className="mt-0.5"
          />
          <span className="text-[length:var(--fs-small)] text-text">
            I’ve pasted this token into Entra.
          </span>
        </label>
      </div>
    </Dialog>
  );
}
