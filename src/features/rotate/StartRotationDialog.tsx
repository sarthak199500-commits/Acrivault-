import { useEffect, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import type { RotationCandidate } from '@/mocks/api';
import { Dialog } from '@/components/ui/Dialog';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Checkbox } from '@/components/ui/Checkbox';
import { Button } from '@/components/ui/Button';
import { Banner } from '@/components/ui/Banner';

export function StartRotationDialog({
  open,
  onOpenChange,
  mode,
  candidates,
  pending,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'standard' | 'emergency';
  candidates: RotationCandidate[];
  pending: boolean;
  onConfirm: (identityId: string) => void;
}) {
  const [identityId, setIdentityId] = useState('');
  const [mfa, setMfa] = useState('');
  const [ack1, setAck1] = useState(false);
  const [ack2, setAck2] = useState(false);

  // Reset the gate each time the dialog opens.
  useEffect(() => {
    if (open) {
      setIdentityId('');
      setMfa('');
      setAck1(false);
      setAck2(false);
    }
  }, [open]);

  const emergency = mode === 'emergency';
  const mfaValid = /^\d{6}$/.test(mfa);
  const canConfirm = !!identityId && (!emergency || (mfaValid && ack1 && ack2));

  const options = candidates.map((c) => ({ value: c.id, label: `${c.name}  ·  risk ${c.riskScore}` }));

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      size={emergency ? 'md' : 'sm'}
      title={emergency ? 'Emergency rotation' : 'Standard rotation'}
      description={
        emergency
          ? 'Emergency rotation revokes the credential immediately. It requires MFA and two acknowledgements.'
          : 'Rotate an identity through the zero-downtime lifecycle.'
      }
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            variant={emergency ? 'danger' : 'primary'}
            disabled={!canConfirm}
            loading={pending}
            leadingIcon={emergency ? <ShieldAlert className="h-4 w-4" /> : undefined}
            onClick={() => onConfirm(identityId)}
          >
            {emergency ? 'Execute emergency rotation' : 'Start rotation'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <span className="mb-1 block text-[length:var(--fs-small)] font-medium text-text-secondary">Identity</span>
          <Select value={identityId} onValueChange={setIdentityId} options={options} placeholder="Select an identity…" ariaLabel="Identity to rotate" className="w-full" />
        </div>

        {emergency && (
          <>
            <Banner tone="critical">
              This bypasses the standard schedule and forces immediate revocation. Dependent identities may be cascaded.
            </Banner>
            <Input
              label="MFA code"
              value={mfa}
              onChange={(e) => setMfa(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="6-digit code"
              inputMode="numeric"
              hint="Enter any 6 digits (synthetic)."
              error={mfa.length > 0 && !mfaValid ? 'Code must be 6 digits.' : undefined}
            />
            <label className="flex items-start gap-2 text-[length:var(--fs-small)] text-text-secondary">
              <Checkbox checked={ack1} onCheckedChange={setAck1} aria-label="Acknowledge immediate revocation" />
              <span>I understand this immediately revokes the current credential.</span>
            </label>
            <label className="flex items-start gap-2 text-[length:var(--fs-small)] text-text-secondary">
              <Checkbox checked={ack2} onCheckedChange={setAck2} aria-label="Acknowledge authorization" />
              <span>I am authorized to perform an emergency rotation on this identity.</span>
            </label>
          </>
        )}
      </div>
    </Dialog>
  );
}
