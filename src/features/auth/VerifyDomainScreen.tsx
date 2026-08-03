import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Check, Copy } from 'lucide-react';
import { AuthCard } from '@/components/ui/AuthCard';
import { RegistrationProgress } from '@/components/ui/RegistrationProgress';
import { Button } from '@/components/ui/Button';
import { Banner } from '@/components/ui/Banner';
import { SkeletonText } from '@/components/ui/Skeleton';
import { domainOf, getDomainChallenge, verifyDomain, type DomainChallenge } from '@/mocks/api';
import { errorInfo } from '@/lib/apiError';
import { announce } from '@/lib/a11y';
import { useFlowStore } from '@/stores/flow';

/** How long the verified beat holds before the flow moves on to Terms. */
const VERIFIED_HOLD_MS = 1800;

/**
 * The verified beat. Decorative only — the heading already says "Domain verified"
 * and announce() carries the outcome to assistive tech, so this is aria-hidden
 * rather than a second thing to read.
 *
 * No animation-delay or fill-mode anywhere here: the global reduced-motion rules
 * crush animation-duration but NOT animation-delay, so a delayed animation with
 * `backwards` fill would sit on its hidden start state and render no check at all.
 */
function SuccessMark() {
  return (
    <span className="relative inline-flex h-14 w-14 items-center justify-center" aria-hidden="true">
      <span className="absolute inset-0 rounded-full bg-[var(--success)] opacity-0 motion-safe:animate-[acv-mark-halo_900ms_ease-out_forwards]" />
      <svg
        viewBox="0 0 52 52"
        className="relative h-14 w-14 motion-safe:animate-[acv-mark-in_240ms_cubic-bezier(0.2,0.8,0.2,1)]"
      >
        <circle cx="26" cy="26" r="24" fill="var(--ok-bg)" stroke="var(--success)" strokeWidth="2" />
        {/* dasharray 30 ≥ the path's ~28 length, so offset 30 hides it completely */}
        <path
          d="M16 26.5 L23 33 L36 20"
          fill="none"
          stroke="var(--success)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="30"
          strokeDashoffset="0"
          className="motion-safe:animate-[acv-mark-draw_460ms_ease-out]"
        />
      </svg>
    </span>
  );
}

/**
 * The DNS record to publish, as a labelled three-column table. A real table rather
 * than a KeyValueList because the three parts are a single record the user
 * transcribes into a DNS console laid out the same way.
 */
function RecordTable({ challenge }: { challenge: DomainChallenge }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(challenge.value);
      setCopied(true);
      announce('Record value copied to clipboard.');
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="overflow-hidden rounded-[var(--r-md)] border border-border">
      <table className="w-full border-collapse text-left">
        <caption className="sr-only">
          DNS record to add for {challenge.domain}
        </caption>
        <thead>
          <tr className="border-b border-border bg-surface-2">
            <th scope="col" className="px-3 py-2 text-[length:var(--fs-small)] font-medium text-text-secondary">
              Type
            </th>
            <th scope="col" className="px-3 py-2 text-[length:var(--fs-small)] font-medium text-text-secondary">
              Name
            </th>
            <th scope="col" className="px-3 py-2 text-[length:var(--fs-small)] font-medium text-text-secondary">
              Data
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="whitespace-nowrap px-3 py-2.5 align-top font-mono text-[length:var(--fs-code)] font-medium text-text">
              {challenge.recordType}
            </td>
            <td className="whitespace-nowrap px-3 py-2.5 align-top font-mono text-[length:var(--fs-code)] text-text-secondary">
              {challenge.name}
            </td>
            <td className="px-3 py-2.5 align-top">
              <div className="flex items-start gap-2">
                {/* break-all: the token has no break opportunities and must not
                    overflow the narrow auth card. */}
                <span className="min-w-0 flex-1 break-all font-mono text-[length:var(--fs-code)] leading-relaxed text-text">
                  {challenge.value}
                </span>
                <button
                  type="button"
                  onClick={copy}
                  className="mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-[var(--r-xs)] text-[length:var(--fs-micro)] text-text-tertiary outline-none hover:text-text focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
                >
                  {copied ? (
                    <Check className="h-3 w-3" aria-hidden="true" />
                  ) : (
                    <Copy className="h-3 w-3" aria-hidden="true" />
                  )}
                  <span className="sr-only">
                    {copied ? 'Record value copied' : 'Copy record value'}
                  </span>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/**
 * Flow A · step 3. Prove the organization controls its email domain by publishing a
 * TXT record. Blocking: Terms is unreachable until this passes, so an unverified
 * domain never reaches tenant provisioning.
 */
export function VerifyDomainScreen() {
  const navigate = useNavigate();
  const email = useFlowStore((s) => s.registerEmail);
  const registerVerified = useFlowStore((s) => s.registerVerified);
  const setDomainVerified = useFlowStore((s) => s.setDomainVerified);

  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [verified, setVerified] = useState(false);

  const domain = domainOf(email);
  const challenge = useQuery({
    queryKey: ['domain-challenge', domain],
    queryFn: () => getDomainChallenge(domain),
    enabled: Boolean(domain),
    staleTime: Infinity, // the record must not appear to rotate mid-verification
  });

  // A confirmation beat long enough to register the success mark, then it advances
  // itself — there is nothing left for the user to do here.
  useEffect(() => {
    if (!verified) return;
    const id = window.setTimeout(() => navigate('/register/terms'), VERIFIED_HOLD_MS);
    return () => window.clearTimeout(id);
  }, [verified, navigate]);

  // Reached only via the email step; a direct hit restarts registration.
  if (!email) return <Navigate to="/register" replace />;
  if (!registerVerified) return <Navigate to="/register/verify" replace />;

  const verify = async () => {
    setError(undefined);
    setVerifying(true);
    try {
      await verifyDomain(domain);
      setDomainVerified(true);
      setVerified(true);
      announce(`${domain} verified.`);
    } catch (err) {
      setError(errorInfo(err).message);
    } finally {
      setVerifying(false);
    }
  };

  if (verified) {
    return (
      <AuthCard title="Domain verified" progress={<RegistrationProgress current={2} />}>
        <div className="flex flex-col items-center gap-3 py-3">
          <SuccessMark />
          <p className="font-mono text-[length:var(--fs-small)] text-text-secondary">{domain}</p>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Verify your domain"
      progress={<RegistrationProgress current={2} />}
      description={
        <>
          Add the DNS record below for{' '}
          <span className="font-medium text-text">{domain}</span> to confirm your organization
          owns it.
        </>
      }
    >
      <div className="space-y-4">
        <Banner tone="info">
          Add this {challenge.data?.recordType ?? 'TXT'} record to your domain’s DNS, then proceed
          to the next step.
        </Banner>

        {challenge.isPending ? (
          <SkeletonText lines={3} />
        ) : challenge.isError ? (
          <Banner
            tone="critical"
            action={
              <Button variant="secondary" size="sm" onClick={() => void challenge.refetch()}>
                Try again
              </Button>
            }
          >
            {errorInfo(challenge.error).message}
          </Banner>
        ) : (
          <RecordTable challenge={challenge.data} />
        )}

        {error && <Banner tone="warning">{error}</Banner>}

        <Button
          type="button"
          className="w-full"
          loading={verifying}
          disabled={!challenge.data}
          trailingIcon={!verifying ? <ArrowRight className="h-4 w-4" /> : undefined}
          onClick={() => void verify()}
        >
          {verifying ? 'Checking DNS…' : 'Verify Domain & Continue'}
        </Button>

        <p className="text-[length:var(--fs-small)] text-text-tertiary">
          Don’t have DNS access? Ask whoever manages{' '}
          <span className="font-medium text-text-secondary">{domain}</span> to add the record, then
          return to this step.
        </p>
      </div>
    </AuthCard>
  );
}
