import { useCallback, useRef, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { AuthCard } from '@/components/ui/AuthCard';
import { PasswordFields } from '@/components/ui/PasswordFields';
import { Button } from '@/components/ui/Button';
import { Banner } from '@/components/ui/Banner';
import { resetPassword } from '@/mocks/api';
import { errorInfo } from '@/lib/apiError';
import { announce } from '@/lib/a11y';
import { useFlowStore } from '@/stores/flow';

/**
 * Recovery step 3. Set a new password, reached two ways:
 *
 *  - `/reset-password/:token` — the emailed link carries its own proof.
 *  - `/reset-password` — the confirmed recovery code is the proof instead.
 *
 * With neither, there is nothing authorising the change, so the flow restarts.
 */
export function ResetPasswordScreen() {
  const { token } = useParams();
  const navigate = useNavigate();
  const otpVerified = useFlowStore((s) => s.resetOtpVerified);
  const setResetOtpVerified = useFlowStore((s) => s.setResetOtpVerified);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [valid, setValid] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [banner, setBanner] = useState<string | undefined>();
  const [pending, setPending] = useState(false);
  /**
   * Latch marking the reset as committed, so burning the OTP flag below cannot
   * re-arm the entry guard and bounce the user to /forgot-password.
   *
   * A ref, not state: setResetOtpVerified is a Zustand update, which flushes a
   * synchronous re-render that jumps ahead of any queued React state update. A
   * `useState` latch would still read false on that render and the guard would win
   * before navigate() ran. A ref mutates immediately, so the guard sees it.
   */
  const done = useRef(false);

  // Stable identity — PasswordFields reports validity from an effect, so a fresh
  // callback each render would re-fire it on every keystroke.
  const handleValidity = useCallback((v: boolean) => setValid(v), []);

  if (!token && !otpVerified && !done.current) return <Navigate to="/forgot-password" replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(undefined);
    setBanner(undefined);
    setPending(true);
    try {
      await resetPassword(token, password);
      // Latch before burning the flag — see the ref's note on ordering.
      done.current = true;
      // Burn the verification so the back button cannot re-enter this screen.
      setResetOtpVerified(false);
      announce('Password reset. Sign in with your new password.');
      navigate('/login');
    } catch (err) {
      const info = errorInfo(err);
      if (info.code === 'WEAK_PASSWORD') setError(info.message);
      else setBanner(info.message);
    } finally {
      setPending(false);
    }
  };

  return (
    <AuthCard
      title="Set a new password"
      description="Choose a strong password you haven’t used before."
      footer={
        <Link to="/login" className="font-medium text-accent-text hover:underline">
          Back to sign in
        </Link>
      }
    >
      {banner && (
        <Banner tone="critical" className="mb-4">
          {banner}
        </Banner>
      )}
      <form onSubmit={submit} noValidate className="space-y-4">
        <PasswordFields
          password={password}
          onPasswordChange={(v) => {
            setPassword(v);
            setError(undefined);
          }}
          confirm={confirm}
          onConfirmChange={setConfirm}
          passwordLabel="New password"
          error={error}
          disabled={pending}
          onValidityChange={handleValidity}
          autoFocusFirst
        />
        <Button type="submit" className="w-full" loading={pending} disabled={!valid}>
          {pending ? 'Saving…' : 'Reset password'}
        </Button>
      </form>
    </AuthCard>
  );
}
