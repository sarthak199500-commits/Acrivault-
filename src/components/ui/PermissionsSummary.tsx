import { Check, Minus } from 'lucide-react';
import { can, ROLE_LABELS, type Capability, type Role } from '@/lib/permissions';

// Representative capabilities described in plain English. Derived from the matrix
// so the summary stays truthful if the matrix changes.
const DESCRIBED: { cap: Capability; phrase: string }[] = [
  { cap: 'view', phrase: 'View the dashboard, inventory, and audit log' },
  { cap: 'audit.export', phrase: 'Export the audit log' },
  { cap: 'investigate', phrase: 'Investigate identities and agent sessions' },
  { cap: 'alert.resolve', phrase: 'Acknowledge and resolve alerts' },
  { cap: 'policy.create', phrase: 'Author and test policies' },
  { cap: 'policy.activate', phrase: 'Activate policies' },
  { cap: 'rotate.request', phrase: 'Recommend a credential rotation' },
  { cap: 'rotate.emergency', phrase: 'Run emergency credential rotation' },
  { cap: 'session.quarantine', phrase: 'Quarantine agent sessions' },
  { cap: 'users.add', phrase: 'Add teammates' },
  { cap: 'users.delete', phrase: 'Suspend and remove users' },
  { cap: 'sso.manage', phrase: 'Configure sign-in & SSO' },
  { cap: 'tenant.manage', phrase: 'Manage organization settings' },
];

/**
 * A plain-English summary of what a role can and cannot do, for the Review
 * Invitation screen. Truthful by construction — it reads the permission matrix.
 */
export function PermissionsSummary({ role }: { role: Role }) {
  const cans = DESCRIBED.filter((d) => can(role, d.cap));
  const cannots = DESCRIBED.filter((d) => !can(role, d.cap));

  return (
    <div className="rounded-[var(--r-md)] border border-border bg-surface-2 p-3">
      <p className="mb-2 text-[length:var(--fs-small)] text-text-secondary">
        As a <span className="font-medium text-text">{ROLE_LABELS[role]}</span>, this user will be able to:
      </p>
      <ul className="space-y-1">
        {cans.map((d) => (
          <li key={d.cap} className="flex items-start gap-2 text-[length:var(--fs-small)] text-text">
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ok-fg" aria-hidden="true" />
            <span><span className="sr-only">Can: </span>{d.phrase}</span>
          </li>
        ))}
      </ul>
      {cannots.length > 0 && (
        <>
          <p className="mb-2 mt-3 text-[length:var(--fs-small)] text-text-secondary">They will not be able to:</p>
          <ul className="space-y-1">
            {cannots.map((d) => (
              <li key={d.cap} className="flex items-start gap-2 text-[length:var(--fs-small)] text-text-tertiary">
                <Minus className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span><span className="sr-only">Cannot: </span>{d.phrase}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
