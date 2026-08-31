import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { SsoButton } from '@/components/ui/SsoButton';
import { CodeInput } from '@/components/ui/CodeInput';
import { ValidityWindowField } from '@/components/ui/ValidityWindowField';
import { PermissionsSummary } from '@/components/ui/PermissionsSummary';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import type { UserStatus, ValidityWindow } from '@/mocks/types';
import type { Role } from '@/lib/permissions';
import { DocCard, Section, StateMatrix } from './doc-primitives';

const USER_STATUSES: UserStatus[] = ['active', 'suspended', 'suspended-idp', 'deleted'];
const DEMO_ROLE: Role = 'analyst';

export function AuthSection() {
  const [code, setCode] = useState('');
  const [validity, setValidity] = useState<ValidityWindow | undefined>();
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      <Section
        id="auth"
        title="Registration & administration"
        description="Components for the organization registration, authentication, and user-administration flows (add-on)."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <DocCard
            title="StatusBadge"
            description="User lifecycle status — deliberately calm."
            bodyClassName="flex flex-wrap items-center gap-2"
            usage="Shows a user's account state in the admin list; never uses the risk-critical color."
            a11y="A leading dot plus the text label carry the status — not color alone."
          >
            {USER_STATUSES.map((s) => (
              <StatusBadge key={s} status={s} />
            ))}
          </DocCard>

          <DocCard
            title="SsoButton"
            description="The prominent 'Continue with [IdP]' control."
            usage="Primary sign-in path on Login and Accept Invitation; password is a clearly secondary fallback."
            a11y="Keyboard focus shows an accent ring; loading sets aria-busy and disables the button."
          >
            <StateMatrix
              cells={[
                { label: 'Entra', node: <div className="w-56"><SsoButton provider="entra" /></div> },
                { label: 'Okta', node: <div className="w-56"><SsoButton provider="okta" /></div> },
                { label: 'Loading', node: <div className="w-56"><SsoButton provider="entra" loading /></div> },
                { label: 'Disabled', node: <div className="w-56"><SsoButton provider="entra" disabled /></div> },
              ]}
            />
          </DocCard>

          <DocCard
            title="CodeInput"
            description="Segmented one-time code; keyboard- and paste-friendly."
            usage="Email verification and MFA challenge entry; one box per digit."
            a11y="Each box is labeled; a paste fills every box at once."
          >
            <CodeInput label="Verification code" value={code} onChange={setCode} />
          </DocCard>

          <DocCard
            title="ValidityWindowField"
            description="Optional access window with expiry-after-start validation."
            usage="Sets a user's start / expiry dates; a lapsed window maps to Suspended (no separate Expired state). Dates use the browser-native picker, so the open calendar is the OS control."
            a11y="The inline validation error uses role=alert."
          >
            <ValidityWindowField value={validity} onChange={setValidity} />
          </DocCard>

          <DocCard
            title="PermissionsSummary"
            description="Plain-English role capabilities, derived from the permission matrix."
            className="lg:col-span-2"
            usage="Shown on the invite review so an admin sees exactly what a role can and cannot do."
          >
            <PermissionsSummary role={DEMO_ROLE} />
          </DocCard>

          <DocCard
            title="ConfirmDialog"
            description="Reversible and destructive confirmations (suspend / permanent delete)."
            className="lg:col-span-2"
            bodyClassName="flex flex-wrap items-center gap-3"
            usage="Gate any irreversible or access-changing action; the danger variant is reserved for permanent deletes."
            a11y="Focus is trapped and Escape closes; the confirm button states the exact action."
          >
            <Button variant="danger" onClick={() => setConfirmOpen(true)}>
              Open confirm dialog
            </Button>
            <span className="text-[length:var(--fs-small)] text-text-tertiary">
              AuthCard, LegalConsent, MfaEnroll, and MfaChallenge are composed on the public auth
              routes (<span className="font-mono">/register</span>, <span className="font-mono">/login</span>,{' '}
              <span className="font-mono">/mfa/setup</span>).
            </span>
          </DocCard>
        </div>
      </Section>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete user"
        description="This action is permanent and cannot be undone. All their activity logs will remain in the audit trail."
        confirmLabel="Permanently delete"
        confirmVariant="danger"
        onConfirm={() => setConfirmOpen(false)}
      />
    </>
  );
}
