import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Clock, RefreshCw } from 'lucide-react';
import { AuthCard } from '@/components/ui/AuthCard';
import { RegistrationProgress } from '@/components/ui/RegistrationProgress';
import { CodeInput } from '@/components/ui/CodeInput';
import { Button } from '@/components/ui/Button';
import { Banner } from '@/components/ui/Banner';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { verifyCode, resendCode, verifyDomain, domainOf, VERIFICATION_CODE } from '@/mocks/api';
import { errorInfo } from '@/lib/apiError';
import { announce } from '@/lib/a11y';
import { useFlowStore } from '@/stores/flow';

const TTL_SECONDS = 600; // 10-minute time-to-live

/**
 * Step 2 covers both halves of "Verify Email & Domain": the emailed code, then
 * domain-ownership confirmation. Domain verification is a phase of this screen
 * rather than a fifth registration step, so the 4-step progress model holds.
 */
type Phase = 'email' | 'verifying-domain' | 'domain-verified' | 'domain-failed';

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
      <span
        className="absolute inset-0 rounded-full bg-[var(--success)] opacity-0 motion-safe:animate-[acv-mark-halo_900ms_ease-out_forwards]"
      />
      <svg
        viewBox="0 0 52 52"
        className="relative h-14 w-14 motion-safe:animate-[acv-mark-in_240ms_cubic-bezier(0.2,0.8,0.2,1)]"
      >
        <circle
          cx="26"
          cy="26"
          r="24"
          fill="var(--ok-bg)"
          stroke="var(--success)"
          strokeWidth="2"
        />
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

function mmss(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Flow A · screen 2. Confirm control of the email with a 6-digit code. */
export function VerifyEmailScreen() {
  const navigate = useNavigate();
  const email = useFlowStore((s) => s.registerEmail);
  const setRegisterVerified = useFlowStore((s) => s.setRegisterVerified);

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [outage, setOutage] = useState(false);
  const [pending, setPending] = useState(false);
  const [seconds, setSeconds] = useState(TTL_SECONDS);
  const [refocus, setRefocus] = useState(0);
  const [phase, setPhase] = useState<Phase>('email');
  const [domainError, setDomainError] = useState<string | undefined>();
  const announced = useRef(false);

  // Countdown. Announce once near the end, not on every tick. It stops once the
  // code is accepted — the code's validity window is irrelevant from then on.
  useEffect(() => {
    if (phase !== 'email' || seconds <= 0) return;
    const id = window.setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(id);
  }, [seconds, phase]);

  useEffect(() => {
    if (seconds === 60 && !announced.current) {
      announced.current = true;
      announce('One minute left to enter your verification code.');
    }
  }, [seconds]);

  // Domain verification is fully backend-side with nothing for the user to do, so
  // the verified card is a confirmation beat rather than a step to act on — long
  // enough to register the success mark, then it advances itself.
  useEffect(() => {
    if (phase !== 'domain-verified') return;
    const id = window.setTimeout(() => navigate('/register/terms'), VERIFIED_HOLD_MS);
    return () => window.clearTimeout(id);
  }, [phase, navigate]);

  if (!email) return <Navigate to="/register" replace />;

  const domain = domainOf(email);

  const restartTimer = () => {
    setSeconds(TTL_SECONDS);
    announced.current = false;
  };

  const runDomainVerification = async () => {
    setDomainError(undefined);
    setPhase('verifying-domain');
    announce(`Verifying ownership of ${domain}.`);
    try {
      await verifyDomain(domain);
      setPhase('domain-verified');
      announce(`${domain} verified.`);
    } catch (err) {
      setDomainError(errorInfo(err).message);
      setPhase('domain-failed');
    }
  };

  const submit = async (value?: string) => {
    const entered = value ?? code;
    setError(undefined);
    setOutage(false);
    setPending(true);
    try {
      await verifyCode(entered);
      setRegisterVerified(true);
      // Email confirmed — hand straight off to domain verification rather than
      // advancing to Terms, so step 2 completes both halves.
      await runDomainVerification();
    } catch (err) {
      const { code: c, message } = errorInfo(err);
      if (c === 'EMAIL_OUTAGE') {
        setOutage(true);
      } else if (c === 'CODE_EXPIRED') {
        setError(message);
        setCode('');
        setRefocus((n) => n + 1);
        // The spec calls for auto-resend on expiry, restarting the 10-minute timer.
        void resendCode().catch(() => undefined);
        restartTimer();
      } else {
        // Invalid code: clear the boxes and refocus the first one so the user can
        // retype immediately rather than deleting six wrong digits by hand.
        setError(message);
        setCode('');
        setRefocus((n) => n + 1);
      }
    } finally {
      setPending(false);
    }
  };

  const resend = async () => {
    setError(undefined);
    setOutage(false);
    setCode('');
    try {
      await resendCode();
      restartTimer();
      announce('A new verification code has been sent.');
    } catch (err) {
      const { code: c } = errorInfo(err);
      if (c === 'EMAIL_OUTAGE') setOutage(true);
    }
  };

  const expired = seconds <= 0;

  if (phase === 'verifying-domain') {
    return (
      <AuthCard
        title="Verifying your domain"
        progress={<RegistrationProgress current={1} />}
        description={
          <>
            Confirming that your organization controls{' '}
            <span className="font-medium text-text">{domain}</span>.
          </>
        }
      >
        <div className="space-y-3 py-2">
          <ProgressBar label="Checking domain ownership" />
          <p className="text-[length:var(--fs-small)] text-text-tertiary">
            This usually takes a few seconds. Please keep this tab open.
          </p>
        </div>
      </AuthCard>
    );
  }

  if (phase === 'domain-verified') {
    return (
      <AuthCard title="Domain verified" progress={<RegistrationProgress current={1} />}>
        <div className="flex flex-col items-center gap-3 py-3">
          <SuccessMark />
          <p className="font-mono text-[length:var(--fs-small)] text-text-secondary">{domain}</p>
        </div>
      </AuthCard>
    );
  }

  if (phase === 'domain-failed') {
    return (
      <AuthCard
        title="We couldn’t verify your domain"
        progress={<RegistrationProgress current={1} />}
        description="Your email is confirmed, but we still need to verify your organization's domain."
      >
        <div className="space-y-4">
          <Banner tone="warning">{domainError}</Banner>
          <Button
            type="button"
            className="w-full"
            leadingIcon={<RefreshCw className="h-4 w-4" />}
            onClick={() => void runDomainVerification()}
          >
            Try again
          </Button>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Verify your email"
      progress={<RegistrationProgress current={1} />}
      description={
        <>
          We sent a 6-digit code to <span className="font-medium text-text">{email}</span>. Enter it
          below to continue.
        </>
      }
    >
      {outage && (
        <Banner tone="warning" className="mb-4">
          We are having trouble sending the verification email. Please try again in a few minutes.
        </Banner>
      )}

      <div className="space-y-4">
        <CodeInput
          label="Verification code"
          value={code}
          onChange={setCode}
          onComplete={(v) => submit(v)}
          error={error}
          disabled={pending}
          autoFocusFirst
          refocusSignal={refocus}
        />

        <p className="flex items-center gap-1.5 text-[length:var(--fs-small)] text-text-tertiary" aria-live="off">
          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
          {expired ? (
            <span>Code expired — request a new one.</span>
          ) : (
            <span>
              Code expires in <span className="tnum text-text-secondary">{mmss(seconds)}</span>
            </span>
          )}
        </p>

        <Button
          type="button"
          className="w-full"
          loading={pending}
          disabled={code.length !== 6 || expired}
          onClick={() => submit()}
        >
          {pending ? 'Verifying…' : 'Verify code'}
        </Button>

        <div className="flex items-center justify-between text-[length:var(--fs-small)]">
          <span className="text-text-tertiary">Didn’t get the code?</span>
          <button
            type="button"
            onClick={resend}
            className="font-medium text-accent-text hover:underline"
          >
            Resend code
          </button>
        </div>

        {/* Reviewer aid, dev builds only — never shipped to production. */}
        {import.meta.env.DEV && (
          <p className="flex items-start gap-2 rounded-[var(--r-sm)] border border-dashed border-border bg-surface-2 px-2.5 py-1.5 text-[length:var(--fs-micro)] text-text-tertiary">
            <span className="shrink-0 rounded-[var(--r-xs)] border border-border bg-surface px-1.5 py-0.5 font-medium uppercase tracking-wide text-text-secondary">
              Demo aid
            </span>
            <span className="self-center">
              Synthetic environment — the code is{' '}
              <span className="tnum font-medium text-text-secondary">{VERIFICATION_CODE}</span>.
            </span>
          </p>
        )}
      </div>
    </AuthCard>
  );
}
