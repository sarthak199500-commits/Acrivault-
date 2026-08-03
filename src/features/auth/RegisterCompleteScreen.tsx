import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { CheckCircle2, ShieldCheck } from 'lucide-react';
import { AuthCard } from '@/components/ui/AuthCard';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useFlowStore } from '@/stores/flow';
import { useUiStore } from '@/stores/ui';

/** Flow A · tenant provisioned; route the owner into the Secure step. */
export function RegisterCompleteScreen() {
  const navigate = useNavigate();
  const email = useFlowStore((s) => s.registerEmail);
  const setFirstRun = useFlowStore((s) => s.setFirstRun);
  const setDiscovered = useUiStore((s) => s.setDiscovered);
  const [provisioning, setProvisioning] = useState(true);

  // A brief, calm provisioning confirmation before revealing the welcome state.
  useEffect(() => {
    // A brand-new tenant was just provisioned — route this owner to onboarding
    // after MFA setup, rather than to an as-yet-empty dashboard.
    setFirstRun(true);
    // The new tenant starts empty until onboarding's scan discovers identities.
    setDiscovered(false);
    const id = window.setTimeout(() => setProvisioning(false), 1400);
    return () => window.clearTimeout(id);
  }, [setFirstRun, setDiscovered]);

  if (!email) return <Navigate to="/register" replace />;

  if (provisioning) {
    return (
      <AuthCard title="Setting up your organization" description="This will only take a moment.">
        <div className="space-y-3 py-2">
          <ProgressBar label="Provisioning tenant" />
          <p className="text-[length:var(--fs-small)] text-text-tertiary">
            Creating your workspace and configuring defaults…
          </p>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="You’re all set"
      description="Your organization is ready. As the first user, you’re the Tenant Admin."
    >
      <div className="space-y-5">
        <div className="flex items-start gap-2.5 rounded-[var(--r-md)] border border-border bg-surface-2 p-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-ok-fg" aria-hidden="true" />
          <div className="text-[length:var(--fs-small)]">
            <p className="font-medium text-text">Organization provisioned</p>
            <p className="text-text-secondary">
              Set a password and enrol in multi-factor authentication to finish. Both are required
              for every account.
            </p>
          </div>
        </div>

        <Button
          type="button"
          className="w-full"
          leadingIcon={<ShieldCheck className="h-4 w-4" />}
          onClick={() => navigate('/register/password')}
        >
          Secure your account
        </Button>
      </div>
    </AuthCard>
  );
}
