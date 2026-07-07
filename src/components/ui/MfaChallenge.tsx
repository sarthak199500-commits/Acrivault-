import { CodeInput } from './CodeInput';

/** The per-sign-in MFA challenge: a CodeInput with retry. */
export function MfaChallenge({
  code,
  onCodeChange,
  onComplete,
  error,
  verifying,
}: {
  code: string;
  onCodeChange: (v: string) => void;
  onComplete?: (v: string) => void;
  error?: string;
  verifying?: boolean;
}) {
  return (
    <div className="space-y-4">
      <p className="text-[length:var(--fs-small)] text-text-secondary">
        Enter the 6-digit code from your authenticator app to finish signing in.
      </p>
      <CodeInput
        label="Authentication code"
        value={code}
        onChange={onCodeChange}
        onComplete={onComplete}
        error={error}
        disabled={verifying}
        autoFocusFirst
      />
    </div>
  );
}
