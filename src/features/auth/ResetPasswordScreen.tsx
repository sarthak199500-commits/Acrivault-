import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AuthCard } from '@/components/ui/AuthCard';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Banner } from '@/components/ui/Banner';
import { resetPassword } from '@/mocks/api';
import { errorInfo } from '@/lib/apiError';

/** Set a new password from a tokened link (fallback path). */
export function ResetPasswordScreen() {
  const { token = '' } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [banner, setBanner] = useState<string | undefined>();
  const [pending, setPending] = useState(false);

  const mismatch = confirm.length > 0 && confirm !== password;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(undefined);
    setBanner(undefined);
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setPending(true);
    try {
      await resetPassword(token, password);
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
      description="Choose a strong password of at least 12 characters."
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
      <form onSubmit={submit} noValidate className="space-y-3">
        <Input
          label="New password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={error && !mismatch ? error : undefined}
          required
        />
        <Input
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={mismatch ? 'Passwords do not match.' : undefined}
          required
        />
        <Button
          type="submit"
          className="w-full"
          loading={pending}
          disabled={password.length < 12 || mismatch || !confirm}
        >
          {pending ? 'Saving…' : 'Reset password'}
        </Button>
      </form>
      <p className="mt-4 rounded-[var(--r-sm)] border border-dashed border-border bg-surface-2 px-2.5 py-1.5 text-[length:var(--fs-micro)] text-text-tertiary">
        Synthetic — open <span className="font-mono text-text-secondary">/reset-password/expired</span>{' '}
        to see the expired-link state.
      </p>
    </AuthCard>
  );
}
