import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { MailCheck } from 'lucide-react';
import { AuthCard } from '@/components/ui/AuthCard';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { forgotPassword } from '@/mocks/api';
import { useFlowStore } from '@/stores/flow';

/**
 * Password-fallback recovery. Always returns a neutral confirmation so the form
 * never reveals whether an account exists.
 */
export function ForgotPasswordScreen() {
  const presetEmail = useFlowStore((s) => s.registerEmail);
  const [email, setEmail] = useState(presetEmail);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setPending(true);
    try {
      await forgotPassword(email);
      setSent(true);
    } finally {
      setPending(false);
    }
  };

  if (sent) {
    return (
      <AuthCard
        title="Check your email"
        description="If an account exists for that address, we’ve sent a link to reset your password."
        footer={
          <Link to="/login" className="font-medium text-accent-text hover:underline">
            Back to sign in
          </Link>
        }
      >
        <div className="flex items-start gap-2.5 rounded-[var(--r-md)] border border-border bg-surface-2 p-3 text-[length:var(--fs-small)] text-text-secondary">
          <MailCheck className="mt-0.5 h-5 w-5 shrink-0 text-ok-fg" aria-hidden="true" />
          The reset link expires in 30 minutes. Multi-factor authentication still applies when you
          sign back in.
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Reset your password"
      description="Enter your email and we’ll send you a reset link. This is the password-fallback path; SSO users sign in through their provider."
      footer={
        <Link to="/login" className="font-medium text-accent-text hover:underline">
          Back to sign in
        </Link>
      }
    >
      <form onSubmit={submit} noValidate className="space-y-4">
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@acme.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Button type="submit" className="w-full" loading={pending} disabled={!email.trim()}>
          {pending ? 'Sending…' : 'Send reset link'}
        </Button>
      </form>
    </AuthCard>
  );
}
