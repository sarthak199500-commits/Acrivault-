import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AuthCard } from '@/components/ui/AuthCard';
import { RegistrationProgress } from '@/components/ui/RegistrationProgress';
import { Button } from '@/components/ui/Button';
import { Banner } from '@/components/ui/Banner';
import { LegalConsent, type Consents } from '@/components/ui/LegalConsent';
import { SkeletonText } from '@/components/ui/Skeleton';
import { acceptLegal, getLegalDocs } from '@/mocks/api';
import { errorInfo } from '@/lib/apiError';
import { useFlowStore } from '@/stores/flow';

/** Flow A · screen 3. Read and accept the ToS and DPA, then create the org. */
export function LegalTermsScreen() {
  const navigate = useNavigate();
  const email = useFlowStore((s) => s.registerEmail);
  const docs = useQuery({ queryKey: ['legal-docs'], queryFn: getLegalDocs });

  const [consents, setConsents] = useState<Consents>({ tos: false, dpa: false });
  const [provisioning, setProvisioning] = useState(false);
  const [error, setError] = useState<string | undefined>();

  if (!email) return <Navigate to="/register" replace />;

  const both = consents.tos && consents.dpa;

  const create = async () => {
    setError(undefined);
    setProvisioning(true);
    try {
      await acceptLegal(consents, email);
      navigate('/register/complete');
    } catch (err) {
      setError(errorInfo(err).message);
    } finally {
      setProvisioning(false);
    }
  };

  return (
    <AuthCard
      title="Review and accept"
      description="Accept the Terms of Service and Data Processing Agreement to create your organization."
      progress={<RegistrationProgress current={2} />}
    >
      {error && (
        <Banner tone="critical" className="mb-4">
          {error}
        </Banner>
      )}

      {docs.isPending ? (
        <SkeletonText lines={8} />
      ) : docs.isError ? (
        <Banner
          tone="critical"
          action={
            <Button variant="secondary" size="sm" onClick={() => void docs.refetch()}>
              Try again
            </Button>
          }
        >
          Unable to load legal documents. Please refresh the page or try again later.
        </Banner>
      ) : (
        <div className="space-y-5">
          <LegalConsent
            docs={docs.data}
            consents={consents}
            onChange={setConsents}
            disabled={provisioning}
          />
          <Button
            type="button"
            className="w-full"
            loading={provisioning}
            disabled={!both}
            onClick={create}
          >
            {provisioning ? 'Creating organization…' : 'Create organization'}
          </Button>
          {!both && (
            <p className="text-center text-[length:var(--fs-small)] text-text-tertiary">
              Both agreements are required to continue.
            </p>
          )}
        </div>
      )}
    </AuthCard>
  );
}
