import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AuthCard } from '@/components/ui/AuthCard';
import { RegistrationProgress } from '@/components/ui/RegistrationProgress';
import { Button } from '@/components/ui/Button';
import { Banner } from '@/components/ui/Banner';
import { MfaEnroll } from '@/components/ui/MfaEnroll';
import { SkeletonText } from '@/components/ui/Skeleton';
import { mfaEnroll, mfaVerify, MFA_CODE } from '@/mocks/api';
import { errorInfo } from '@/lib/apiError';
import { useAuthStore } from '@/stores/auth';
import { useFlowStore } from '@/stores/flow';

/** Mandatory MFA enrollment. There is never an option to skip or disable it. */
export function MfaSetupScreen() {
  const navigate = useNavigate();
  const signIn = useAuthStore((s) => s.signIn);
  const firstRun = useFlowStore((s) => s.firstRun);
  const setFirstRun = useFlowStore((s) => s.setFirstRun);
  const enrollment = useQuery({ queryKey: ['mfa-enroll'], queryFn: mfaEnroll, staleTime: Infinity });

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [verifying, setVerifying] = useState(false);

  const confirm = async (value?: string) => {
    setError(undefined);
    setVerifying(true);
    try {
      await mfaVerify(value ?? code);
      signIn();
      // First-run registration lands on Onboarding & Connect; invited users
      // (existing, already-connected tenant) go straight to the dashboard.
      const toOnboarding = firstRun;
      setFirstRun(false);
      navigate(toOnboarding ? '/onboarding' : '/');
    } catch (err) {
      setError(errorInfo(err).message);
      setCode('');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <AuthCard
      title="Set up authentication"
      progress={firstRun ? <RegistrationProgress current={3} /> : undefined}
    >
      {enrollment.isPending ? (
        <SkeletonText lines={6} />
      ) : enrollment.isError ? (
        <Banner
          tone="critical"
          action={
            <Button variant="secondary" size="sm" onClick={() => void enrollment.refetch()}>
              Try again
            </Button>
          }
        >
          Could not start MFA enrollment. Please try again.
        </Banner>
      ) : (
        <div className="space-y-5">
          <MfaEnroll
            enrollment={enrollment.data}
            code={code}
            onCodeChange={setCode}
            onComplete={(v) => confirm(v)}
            error={error}
            verifying={verifying}
          />
          <Button
            type="button"
            className="w-full"
            loading={verifying}
            disabled={code.length !== 6}
            onClick={() => confirm()}
          >
            {verifying ? 'Verifying…' : 'Confirm and continue'}
          </Button>
          {/* Reviewer aid, dev builds only — never shipped to production. */}
          {import.meta.env.DEV && (
            <p className="flex items-center justify-center gap-2 text-[length:var(--fs-micro)] text-text-tertiary">
              <span className="rounded-[var(--r-xs)] border border-border bg-surface px-1.5 py-0.5 font-medium uppercase tracking-wide text-text-secondary">
                Demo aid
              </span>
              <span>
                Synthetic — the code is{' '}
                <span className="tnum font-medium text-text-secondary">{MFA_CODE}</span>.
              </span>
            </p>
          )}
        </div>
      )}
    </AuthCard>
  );
}
