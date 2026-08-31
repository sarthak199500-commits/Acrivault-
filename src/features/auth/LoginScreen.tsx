import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AuthCard } from '@/components/ui/AuthCard';
import { SsoButton } from '@/components/ui/SsoButton';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Banner } from '@/components/ui/Banner';
import { getTenant, login, ssoReturn, ssoStart } from '@/mocks/api';
import { isSignInFederated } from '@/lib/sso';
import { SSO_PROVIDER_LABELS } from '@/mocks/types';
import { errorInfo } from '@/lib/apiError';
import { useAuthStore } from '@/stores/auth';
import { useUiStore } from '@/stores/ui';

/** Labelled rule separating the two sign-in methods. */
function OrDivider() {
  return (
    <div className="flex items-center gap-3" aria-hidden="true">
      <span className="h-px flex-1 bg-border" />
      <span className="text-[length:var(--fs-micro)] uppercase tracking-wide text-text-tertiary">or</span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

/**
 * Sign in. An IdP-backed tenant leads with SSO but can fall back to email +
 * password; a tenant with no IdP gets the password form alone. Either way the
 * password path runs through the MFA challenge, so MFA is never skipped. The dev
 * toggle previews both tenant shapes.
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
  // Which method is on screen. Only meaningful for an SSO tenant — without an IdP
  // there is nothing to switch to, so the password form is the whole screen.
  const [mode, setMode] = useState<'sso' | 'password'>('sso');

  const provider = tenant.data?.sso.provider ?? 'entra';
  const tenantHasIdp = tenant.data ? isSignInFederated(tenant.data.saml, new Date()) : true;
  // 'auto' follows the tenant; otherwise the dev toggle forces a path.
  const ssoOffered = signInPref === 'auto' ? tenantHasIdp : signInPref === 'sso';
  const showSso = ssoOffered && mode === 'sso';

  // Switching methods drops a stale banner — an SSO failure must not hang over the
  // password form (and vice versa).
  const switchTo = (next: 'sso' | 'password') => {
    setError(undefined);
    setMode(next);
  };

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
        showSso
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

      {showSso ? (
        <div className="space-y-4">
          <div className="space-y-3">
            <SsoButton provider={provider} onClick={handleSso} loading={ssoPending} />
            <p className="text-center text-[length:var(--fs-small)] text-text-secondary">
              You’ll be redirected to {SSO_PROVIDER_LABELS[provider]} to authenticate. MFA is handled there.
            </p>
          </div>
          <OrDivider />
          {/* Ghost: a real alternate action, not a footnote — full width so it reads
              as a peer of the primary method above it. */}
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => switchTo('password')}
          >
            Sign in with password instead
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
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
          {/* Only an SSO tenant has a method to go back to. */}
          {ssoOffered && (
            <>
              <OrDivider />
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => switchTo('sso')}
              >
                Use single sign-on instead
              </Button>
            </>
          )}
        </div>
      )}
    </AuthCard>
  );
}
