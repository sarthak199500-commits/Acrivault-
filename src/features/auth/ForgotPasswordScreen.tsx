import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { AuthCard } from '@/components/ui/AuthCard';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { forgotPassword } from '@/mocks/api';
import { useFlowStore } from '@/stores/flow';

/**
 * Recovery step 1. Capture the email, then hand off to the code screen.
 *
 * Advancing reveals nothing about whether the account exists: the code screen is
 * shown either way, and its copy stays conditional ("if an account exists").
 */
export function ForgotPasswordScreen() {
  const navigate = useNavigate();
  const presetEmail = useFlowStore((s) => s.registerEmail);
  const setResetEmail = useFlowStore((s) => s.setResetEmail);
  const setResetOtpVerified = useFlowStore((s) => s.setResetOtpVerified);
  const [email, setEmail] = useState(presetEmail);
  const [pending, setPending] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setPending(true);
    try {
      await forgotPassword(email);
      setResetEmail(email.trim());
      // Clear any prior verification so the reset screen cannot be reached on a
      // stale flag left by an abandoned attempt.
      setResetOtpVerified(false);
      navigate('/forgot-password/verify');
    } finally {
      setPending(false);
    }
  };

  return (
    <AuthCard
      title="Reset your password"
      description="Enter your email and we’ll send you a 6-digit recovery code. This is the password-fallback path; SSO users sign in through their provider."
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
          hint="Multi-factor authentication still applies when you sign back in."
          required
        />
        <Button
          type="submit"
          className="w-full"
          loading={pending}
          disabled={!email.trim()}
          trailingIcon={!pending ? <ArrowRight className="h-4 w-4" /> : undefined}
        >
          {pending ? 'Sending…' : 'Send recovery code'}
        </Button>
      </form>
    </AuthCard>
  );
}
