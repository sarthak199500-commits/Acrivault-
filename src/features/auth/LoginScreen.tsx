import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AuthCard } from '@/components/ui/AuthCard';
import { SsoButton } from '@/components/ui/SsoButton';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Banner } from '@/components/ui/Banner';
import { getTenant, login, ssoReturn, ssoStart } from '@/mocks/api';
import { SSO_PROVIDER_LABELS } from '@/mocks/types';
import { errorInfo } from '@/lib/apiError';
import { useAuthStore } from '@/stores/auth';
import { useUiStore } from '@/stores/ui';

/**
 * Sign in. The method is decided per tenant: an IdP-backed tenant uses SSO only
 * (password is never offered); a tenant with no IdP uses the email + password
 * fallback. The dev toggle previews both forks.
 */
export function LoginScreen() {
  const navigate = useNavigate();
  const signIn = useAuthStore((s) => s.signIn);
  const tenant = useQuery({ queryKey: ['tenant'], queryFn: getTenant });
  const signInPref = useUiStore((s) => s.scenario.signIn);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [pending, setPending] = useState(false);
  const [ssoPending, setSsoPending] = useState(false);

  const provider = tenant.data?.sso.provider ?? 'entra';
  const tenantHasIdp = tenant.data?.sso.configured ?? true;
  // 'auto' follows the tenant; otherwise the dev toggle forces a path.
  const useSso = signInPref === 'auto' ? tenantHasIdp : signInPref === 'sso';

  const handleSso = async () => {
    setError(undefined);
    setSsoPending(true);
    try {
      if (provider === 'entra' || provider === 'okta') await ssoStart(provider);
      await ssoReturn();
      // SSO enforces MFA upstream; sign straight in.
      signIn();
      navigate('/');
    } catch (err) {
      setError(errorInfo(err).message);
    } finally {
      setSsoPending(false);
    }
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError(undefined);
    setPending(true);
    try {
      await login(email, password);
      // Password sign-in always proceeds to the MFA challenge.
      navigate('/mfa/challenge');
    } catch (err) {
      setError(errorInfo(err).message);
    } finally {
      setPending(false);
    }
  };

  return (
    <AuthCard
      title="Sign in to Acrivault"
      description={
        useSso
          ? 'Your organization uses single sign-on.'
          : 'Enter your email and password to continue.'
      }
      footer={
        <span>
          New organization?{' '}
          <Link to="/register" className="font-medium text-accent-text hover:underline">
            Request access
          </Link>
        </span>
      }
    >
      {error && (
        <Banner tone="critical" className="mb-4">
          {error}
        </Banner>
      )}

      {useSso ? (
        <div className="space-y-3">
          <SsoButton provider={provider} onClick={handleSso} loading={ssoPending} />
          <p className="text-center text-[length:var(--fs-small)] text-text-secondary">
            You’ll be redirected to {SSO_PROVIDER_LABELS[provider]} to authenticate. MFA is handled there.
          </p>
        </div>
      ) : (
        <form onSubmit={handleLogin} noValidate className="space-y-3">
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="you@acme.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            label="Password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <div className="flex justify-end">
            <Link
              to="/forgot-password"
              className="text-[length:var(--fs-small)] font-medium text-accent-text hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <Button
            type="submit"
            variant="secondary"
            className="w-full"
            loading={pending}
            disabled={!email.trim() || !password}
          >
            {pending ? 'Signing in…' : 'Sign in with password'}
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
