import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2 } from 'lucide-react';
import { AuthCard } from '@/components/ui/AuthCard';
import { SsoButton } from '@/components/ui/SsoButton';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Banner } from '@/components/ui/Banner';
import { KeyValueList } from '@/components/ui/KeyValueList';
import { SkeletonText } from '@/components/ui/Skeleton';
import { acceptInvite, getTenant, resolveInvite, ssoReturn, ssoStart } from '@/mocks/api';
import { ROLE_LABELS } from '@/lib/permissions';
import { SSO_PROVIDER_LABELS } from '@/mocks/types';
import { errorInfo } from '@/lib/apiError';
import { useAuthStore } from '@/stores/auth';
import { useUiStore } from '@/stores/ui';

/** Flow B entry. Resolve an invitation, then route through SSO or the password+MFA fallback. */
export function AcceptInviteScreen() {
  const { token = '' } = useParams();
  const navigate = useNavigate();
  const signIn = useAuthStore((s) => s.signIn);
  const signInPref = useUiStore((s) => s.scenario.signIn);
  const tenant = useQuery({ queryKey: ['tenant'], queryFn: getTenant });
  const invite = useQuery({ queryKey: ['invite', token], queryFn: () => resolveInvite(token), retry: false });

  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | undefined>();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const provider = tenant.data?.sso.provider ?? 'entra';

  const joinWithSso = async () => {
    setJoinError(undefined);
    setJoining(true);
    try {
      if (provider === 'entra' || provider === 'okta') await ssoStart(provider);
      await ssoReturn();
      await acceptInvite(token);
      signIn();
      navigate('/');
    } catch (err) {
      setJoinError(errorInfo(err).message);
      setJoining(false);
    }
  };

  // Password fallback: set a password, accept, then enrol in mandatory MFA.
  const joinWithPassword = async (e: FormEvent) => {
    e.preventDefault();
    setJoinError(undefined);
    if (password.length < 12) {
      setJoinError('Password must be at least 12 characters.');
      return;
    }
    if (password !== confirm) {
      setJoinError('Passwords do not match.');
      return;
    }
    setJoining(true);
    try {
      // ASSUMPTION: password creation is simulated; the UI never stores it.
      await acceptInvite(token);
      navigate('/mfa/setup');
    } catch (err) {
      setJoinError(errorInfo(err).message);
      setJoining(false);
    }
  };

  if (invite.isPending) {
    return (
      <AuthCard title="Checking your invitation" description="One moment…">
        <SkeletonText lines={4} />
      </AuthCard>
    );
  }

  if (invite.isError) {
    const { code, message } = errorInfo(invite.error);
    if (code === 'ALREADY_ACCEPTED') {
      return (
        <AuthCard
          title="You’re already a member"
          description="This invitation has already been accepted."
          footer={
            <Link to="/login" className="font-medium text-accent-text hover:underline">
              Go to sign in
            </Link>
          }
        >
          <p className="text-[length:var(--fs-small)] text-text-secondary">
            You are already a member of this organization. Please log in to continue.
          </p>
        </AuthCard>
      );
    }
    return (
      <AuthCard title="This invitation can’t be used" description={message}>
        <div className="space-y-4">
          {code === 'EXPIRED_TOKEN' && (
            <Banner tone="warning">
              Invitation links expire for security. Ask an administrator to send you a fresh invitation,
              then open the new link.
            </Banner>
          )}
          <Link to="/login" className="block">
            <Button variant="secondary" className="w-full">
              Back to sign in
            </Button>
          </Link>
        </div>
      </AuthCard>
    );
  }

  const data = invite.data;
  // The invitation captured the method at send time; the dev toggle can preview either.
  const useSso = signInPref === 'auto' ? data.authMethod === 'sso' : signInPref === 'sso';

  return (
    <AuthCard
      title={`Join ${tenant.data?.name ?? 'your organization'}`}
      description={
        <>
          You’ve been invited as a <span className="font-medium text-text">{ROLE_LABELS[data.role]}</span>.
        </>
      }
    >
      <div className="space-y-5">
        {joinError && <Banner tone="critical">{joinError}</Banner>}

        <KeyValueList
          boxed
          items={[
            { label: 'Email', value: <span className="font-medium">{data.email}</span> },
            { label: 'Role', value: ROLE_LABELS[data.role] },
            {
              label: 'Sign-in',
              value: useSso ? `SSO via ${SSO_PROVIDER_LABELS[provider]}` : 'Email & password',
            },
          ]}
        />

        <p className="flex items-start gap-2 text-[length:var(--fs-small)] text-text-secondary">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-ok-fg" aria-hidden="true" />
          Multi-factor authentication is required and will be set up after you continue.
        </p>

        {useSso ? (
          <SsoButton provider={provider} onClick={joinWithSso} loading={joining} />
        ) : (
          <form onSubmit={joinWithPassword} noValidate className="space-y-3">
            <Input
              label="Create password"
              type="password"
              autoComplete="new-password"
              placeholder="At least 12 characters"
              hint="Use at least 12 characters."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Input
              label="Confirm password"
              type="password"
              autoComplete="new-password"
              placeholder="Re-enter your password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
            <Button type="submit" className="w-full" loading={joining} disabled={!password || !confirm}>
              {joining ? 'Creating account…' : 'Set password & continue'}
            </Button>
          </form>
        )}
      </div>
    </AuthCard>
  );
}
