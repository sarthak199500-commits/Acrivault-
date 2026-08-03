import { useCallback, useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ArrowRight, KeyRound } from 'lucide-react';
import { AuthCard } from '@/components/ui/AuthCard';
import { RegistrationProgress } from '@/components/ui/RegistrationProgress';
import { PasswordFields } from '@/components/ui/PasswordFields';
import { Button } from '@/components/ui/Button';
import { Banner } from '@/components/ui/Banner';
import { createPassword } from '@/mocks/api';
import { errorInfo } from '@/lib/apiError';
import { announce } from '@/lib/a11y';
import { useFlowStore } from '@/stores/flow';

/**
 * Flow A · step 5a. The tenant owner sets the password backing the email + password
 * sign-in path, then enrols in MFA.
 *
 * Password before MFA, matching AcceptInviteScreen: the first factor is established
 * before the second is added. Both screens are step 5 ("Secure").
 */
export function CreatePasswordScreen() {
  const navigate = useNavigate();
  const email = useFlowStore((s) => s.registerEmail);
  const firstRun = useFlowStore((s) => s.firstRun);
  const setPasswordSet = useFlowStore((s) => s.setPasswordSet);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [valid, setValid] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [banner, setBanner] = useState<string | undefined>();
  const [pending, setPending] = useState(false);

  // Stable identity — PasswordFields reports validity from an effect, so a fresh
  // callback each render would re-fire it on every keystroke.
  const handleValidity = useCallback((v: boolean) => setValid(v), []);

  // Only reachable inside a fresh registration. firstRun stays set until MFA
  // completes, so nothing here can re-arm this guard mid-submit.
  if (!email || !firstRun) return <Navigate to="/login" replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(undefined);
    setBanner(undefined);
    setPending(true);
    try {
      await createPassword(email, password);
      setPasswordSet(true);
      announce('Password created.');
      // MFA enrollment is mandatory and closes out the Secure step.
      navigate('/mfa/setup');
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
      title="Create your password"
      progress={<RegistrationProgress current={4} />}
      description={
        <>
          Set the password for <span className="font-medium text-text">{email}</span>. Next you’ll
          add multi-factor authentication.
        </>
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
          passwordLabel="Create password"
          error={error}
          disabled={pending}
          onValidityChange={handleValidity}
          autoFocusFirst
        />

        <div className="flex items-start gap-2.5 rounded-[var(--r-md)] border border-border bg-surface-2 p-3 text-[length:var(--fs-small)] text-text-secondary">
          <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-text-tertiary" aria-hidden="true" />
          Multi-factor authentication is required and is set up on the next screen. This password
          never replaces your second factor.
        </div>

        <Button
          type="submit"
          className="w-full"
          loading={pending}
          disabled={!valid}
          trailingIcon={!pending ? <ArrowRight className="h-4 w-4" /> : undefined}
        >
          {pending ? 'Saving…' : 'Save password & continue'}
        </Button>
      </form>
    </AuthCard>
  );
}
