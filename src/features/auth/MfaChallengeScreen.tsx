import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthCard } from '@/components/ui/AuthCard';
import { Button } from '@/components/ui/Button';
import { MfaChallenge } from '@/components/ui/MfaChallenge';
import { mfaVerify, MFA_CODE } from '@/mocks/api';
import { errorInfo } from '@/lib/apiError';
import { useAuthStore } from '@/stores/auth';

/** The per-sign-in MFA challenge on the password-fallback path. */
export function MfaChallengeScreen() {
  const navigate = useNavigate();
  const signIn = useAuthStore((s) => s.signIn);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [verifying, setVerifying] = useState(false);

  const verify = async (value?: string) => {
    setError(undefined);
    setVerifying(true);
    try {
      await mfaVerify(value ?? code);
      signIn();
      navigate('/');
    } catch (err) {
      setError(errorInfo(err).message);
      setCode('');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <AuthCard title="Verify it’s you" description="One more step to finish signing in.">
      <div className="space-y-5">
        <MfaChallenge
          code={code}
          onCodeChange={setCode}
          onComplete={(v) => verify(v)}
          error={error}
          verifying={verifying}
        />
        <Button
          type="button"
          className="w-full"
          loading={verifying}
          disabled={code.length !== 6}
          onClick={() => verify()}
        >
          {verifying ? 'Verifying…' : 'Verify'}
        </Button>
        <p className="text-center text-[length:var(--fs-micro)] text-text-tertiary">
          Synthetic — the code is{' '}
          <span className="tnum font-medium text-text-secondary">{MFA_CODE}</span>.
        </p>
      </div>
    </AuthCard>
  );
}
