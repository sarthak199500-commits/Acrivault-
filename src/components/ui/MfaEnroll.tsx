import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import type { MfaEnrollment } from '@/mocks/api';
import { CodeInput } from './CodeInput';

/**
 * MFA enrollment: the placeholder QR, the manual secret, and a confirm CodeInput.
 * MFA cryptography is upstream; the QR is decorative (not a real otpauth URI).
 */
export function MfaEnroll({
  enrollment,
  code,
  onCodeChange,
  onComplete,
  error,
  verifying,
}: {
  enrollment: MfaEnrollment;
  code: string;
  onCodeChange: (v: string) => void;
  onComplete?: (v: string) => void;
  error?: string;
  verifying?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const copyKey = async () => {
    try {
      await navigator.clipboard.writeText(enrollment.secret);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (e.g. insecure context) — the key stays select-all'able.
    }
  };

  return (
    <div className="space-y-5">
      <ol className="space-y-1 text-[length:var(--fs-small)] text-text-secondary">
        <li>1. Scan this code with your authenticator app, or enter the key manually.</li>
        <li>2. Enter the 6-digit code it generates to confirm.</li>
      </ol>

      {/* Setup material (QR + manual key) grouped into one inset panel so it reads as a
          single "set up your authenticator" step, distinct from the code input below. */}
      <div className="flex flex-col items-center gap-3 rounded-[var(--r-md)] border border-border bg-surface-2 p-4">
        <div
          className="h-40 w-40 rounded-[var(--r-md)] border border-border-strong bg-white p-2 text-[#0a0a0a]"
          // The QR is a decorative placeholder, not a scannable otpauth URI. // ASSUMPTION
          aria-hidden="true"
          dangerouslySetInnerHTML={{ __html: enrollment.qrSvg }}
        />
        <p className="sr-only">A placeholder QR code is shown. Use the setup key below to enroll.</p>
        <div className="text-center">
          <div className="eyebrow mb-1">Setup key</div>
          <div className="inline-flex items-center gap-1.5">
            <code className="tnum select-all rounded-[var(--r-sm)] border border-border bg-surface px-2.5 py-1 font-mono text-[length:var(--fs-small)] tracking-wider text-text">
              {enrollment.secret}
            </code>
            <button
              type="button"
              onClick={copyKey}
              aria-label={copied ? 'Setup key copied' : 'Copy setup key'}
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--r-sm)] border border-border text-text-tertiary transition-colors hover:bg-surface-hover hover:text-text"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-ok-fg" aria-hidden="true" />
              ) : (
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              )}
            </button>
          </div>
          <span role="status" aria-live="polite" className="sr-only">
            {copied ? 'Setup key copied to clipboard.' : ''}
          </span>
        </div>
      </div>

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
