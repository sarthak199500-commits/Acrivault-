import { cn } from '@/lib/cn';

/**
 * Compact progress indicator for the multi-screen registration flow. A segmented
 * bar (decorative) plus a visible "Step N of M — Label" caption that carries the
 * progress for assistive tech — sized to fit the narrow auth card where a fully
 * labelled horizontal stepper would crowd.
 */
/**
 * Domain ownership is its own numbered step, distinct from the emailed code.
 * "Secure" is shared by password creation and MFA enrollment — one securing step
 * completed across two screens, in that order.
 */
export const REGISTRATION_STEPS = ['Account', 'Verify', 'Domain', 'Terms', 'Secure'] as const;

export function RegistrationProgress({ current }: { current: number }) {
  const total = REGISTRATION_STEPS.length;
  const clamped = Math.max(0, Math.min(total - 1, current));
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="eyebrow">Registration</span>
        <span className="text-[length:var(--fs-micro)] text-text-tertiary">
          Step <span className="tnum text-text-secondary">{clamped + 1}</span> of {total} ·{' '}
          {REGISTRATION_STEPS[clamped]}
        </span>
      </div>
      <ol className="flex gap-1.5" aria-hidden="true">
        {REGISTRATION_STEPS.map((label, i) => (
          <li
            key={label}
            className={cn('h-1 flex-1 rounded-full', i <= clamped ? 'bg-accent' : 'bg-surface-2')}
          />
        ))}
      </ol>
    </div>
  );
}
