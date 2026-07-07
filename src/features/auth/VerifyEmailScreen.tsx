import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { AuthCard } from '@/components/ui/AuthCard';
import { RegistrationProgress } from '@/components/ui/RegistrationProgress';
import { CodeInput } from '@/components/ui/CodeInput';
import { Button } from '@/components/ui/Button';
import { Banner } from '@/components/ui/Banner';
import { verifyCode, resendCode, VERIFICATION_CODE } from '@/mocks/api';
import { errorInfo } from '@/lib/apiError';
import { announce } from '@/lib/a11y';
import { useFlowStore } from '@/stores/flow';

const TTL_SECONDS = 600; // 10-minute time-to-live

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
  const announced = useRef(false);

  // Countdown. Announce once near the end, not on every tick.
  useEffect(() => {
    if (seconds <= 0) return;
    const id = window.setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(id);
  }, [seconds]);

  useEffect(() => {
    if (seconds === 60 && !announced.current) {
      announced.current = true;
      announce('One minute left to enter your verification code.');
    }
  }, [seconds]);

  if (!email) return <Navigate to="/register" replace />;

  const restartTimer = () => {
    setSeconds(TTL_SECONDS);
    announced.current = false;
  };

  const submit = async (value?: string) => {
    const entered = value ?? code;
    setError(undefined);
    setOutage(false);
    setPending(true);
    try {
      await verifyCode(entered);
      setRegisterVerified(true);
      navigate('/register/terms');
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
