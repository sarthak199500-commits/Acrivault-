import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { AuthCard } from '@/components/ui/AuthCard';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Banner } from '@/components/ui/Banner';
import { buttonClasses } from '@/components/ui/Button';
import { RegistrationProgress } from '@/components/ui/RegistrationProgress';
import { requestAccess } from '@/mocks/api';
import { errorInfo } from '@/lib/apiError';
import { useFlowStore } from '@/stores/flow';

/** Flow A · step 1. A new organization starts here with a work email. */
export function RequestAccessScreen() {
  const navigate = useNavigate();
  const setRegisterEmail = useFlowStore((s) => s.setRegisterEmail);
  const initial = useFlowStore((s) => s.registerEmail);
  const [email, setEmail] = useState(initial);
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [registered, setRegistered] = useState(false);
  const [pending, setPending] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setFieldError(undefined);
    setRegistered(false);
    setPending(true);
    try {
      const res = await requestAccess(email);
      setRegisterEmail(res.email);
      // Clear every downstream flag: re-entering with a different email must not
      // inherit verification from an abandoned attempt.
      const flow = useFlowStore.getState();
      flow.setRegisterVerified(false);
      flow.setDomainVerified(false);
      flow.setPasswordSet(false);
      navigate('/register/verify');
    } catch (err) {
      const { code, message } = errorInfo(err);
      if (code === 'DOMAIN_REGISTERED') setRegistered(true);
      else setFieldError(message);
    } finally {
      setPending(false);
    }
  };

  return (
    <AuthCard
      title="Request access"
      description="Set up Acrivault for your organization. Enter your work email to get started."
      progress={<RegistrationProgress current={0} />}
      footer={
        <span>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-accent-text hover:underline">
            Sign in
          </Link>
        </span>
      }
    >
      {registered && (
        <Banner
          tone="info"
          className="mb-4"
          action={
            <Link to="/login" className={buttonClasses('secondary', 'sm')}>
              Log in
            </Link>
          }
        >
          This organization is already registered. Please contact your administrator or log in
          directly.
        </Banner>
      )}

      <form onSubmit={submit} noValidate className="space-y-4">
        <Input
          label="Work email"
          type="email"
          autoComplete="email"
          placeholder="you@yourcompany.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setFieldError(undefined);
            setRegistered(false);
          }}
          error={fieldError}
          hint={!fieldError ? 'Use your organization email, not a personal address.' : undefined}
          required
        />
        <Button
          type="submit"
          className="w-full"
          loading={pending}
          disabled={!email.trim()}
          trailingIcon={!pending ? <ArrowRight className="h-4 w-4" /> : undefined}
        >
          {pending ? 'Verifying…' : 'Request access'}
        </Button>
      </form>
    </AuthCard>
  );
}
