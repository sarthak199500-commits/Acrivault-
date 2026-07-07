import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { SSO_PROVIDER_LABELS, type SsoProvider } from '@/mocks/types';

/** Small provider marks. Decorative; the label carries the meaning. */
function ProviderMark({ provider }: { provider: 'entra' | 'okta' }) {
  if (provider === 'entra') {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <path fill="#f25022" d="M3 3h8.5v8.5H3z" />
        <path fill="#7fba00" d="M12.5 3H21v8.5h-8.5z" />
        <path fill="#00a4ef" d="M3 12.5h8.5V21H3z" />
        <path fill="#ffb900" d="M12.5 12.5H21V21h-8.5z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="none" stroke="#007dc1" strokeWidth="3.4" />
    </svg>
  );
}

/**
 * The primary "Continue with [provider]" control. SSO is the prominent path on
 * Login and Accept Invitation; password is a clearly secondary fallback.
 */
export function SsoButton({
  provider,
  onClick,
  loading,
  disabled,
  className,
}: {
  provider: SsoProvider;
  onClick?: () => void;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const named = provider === 'entra' || provider === 'okta';
  const label = named ? `Continue with ${SSO_PROVIDER_LABELS[provider]}` : 'Continue with SSO';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'relative flex h-11 w-full items-center justify-center gap-2.5 rounded-[var(--r-sm)] border font-medium',
        'border-border-strong bg-surface text-text',
        'transition-colors duration-[var(--dur-1)] hover:bg-surface-hover',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--accent)_45%,transparent)]',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className,
      )}
    >
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
      ) : (
        named && <ProviderMark provider={provider} />
      )}
      {label}
    </button>
  );
}
