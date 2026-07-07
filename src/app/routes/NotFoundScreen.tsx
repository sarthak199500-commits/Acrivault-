import { type ReactNode } from 'react';
import { Link, useRouteError, isRouteErrorResponse } from 'react-router-dom';
import { Search, RotateCw } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button, buttonClasses } from '@/components/ui/Button';

/**
 * 404 illustration in Acrivault's own visual language: an identity relationship
 * graph whose known path (solid edges, green "you are here" anchor) degrades into
 * a broken dashed edge ending in an empty node — the screen that doesn't exist.
 * Neutral currentColor linework (theme-aware) with a single brand-green accent;
 * a missing route is not a risk, so color stays reserved.
 */
function LostRouteArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 150" className={className} fill="none" aria-hidden="true" focusable="false">
      <g
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      >
        {/* known path: solid edges */}
        <path d="M42 92 L80 56" opacity="0.55" />
        <path d="M93 51 L131 51" opacity="0.55" />
        {/* broken edge: dashed, leading to the missing node */}
        <path d="M148 56 L172 86" opacity="0.5" strokeDasharray="2.5 5" />
        {/* anchor node — "you are here" — single brand-green accent */}
        <circle cx="38" cy="96" r="6.5" fill="var(--logo-mark)" stroke="var(--logo-mark)" opacity="0.95" />
        <circle cx="38" cy="96" r="11.5" stroke="var(--logo-mark)" opacity="0.4" />
        {/* known solid nodes */}
        <circle cx="86" cy="51" r="6" fill="currentColor" stroke="none" opacity="0.7" />
        <circle cx="140" cy="51" r="6" fill="currentColor" stroke="none" opacity="0.7" />
        {/* missing node: dashed outline, empty except for "?" */}
        <circle cx="178" cy="92" r="14.5" opacity="0.55" strokeDasharray="3 4.5" />
        <text
          x="178"
          y="92"
          fill="currentColor"
          stroke="none"
          opacity="0.7"
          fontFamily="Georgia, 'Times New Roman', serif"
          fontSize="16"
          fontStyle="italic"
          textAnchor="middle"
          dominantBaseline="central"
        >
          ?
        </text>
      </g>
    </svg>
  );
}

/**
 * Generic-error illustration: a credential token lifted out of its socket — the
 * binding is severed. Distinct from the 404 graph so the two screens read apart.
 */
function SeveredLinkArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 150" className={className} fill="none" aria-hidden="true" focusable="false">
      {/* broken binding axis */}
      <g opacity="0.16">
        <line x1="40" y1="76" x2="96" y2="76" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeDasharray="2 6" />
        <line x1="124" y1="76" x2="180" y2="76" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeDasharray="2 6" />
      </g>
      {/* socket panel */}
      <g stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" opacity="0.55">
        <path d="M28 50 V102 H44" fill="none" />
        <rect x="44" y="58" width="32" height="36" rx="6" fill="none" />
        <rect x="53" y="67" width="18" height="18" rx="3" fill="none" opacity="0.6" />
      </g>
      <g stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" opacity="0.5">
        <line x1="76" y1="71" x2="90" y2="71" />
        <line x1="76" y1="81" x2="90" y2="81" />
      </g>
      {/* unbound token, tilted, carrying the "?" */}
      <g transform="rotate(9 150 74)" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <rect x="132" y="54" width="46" height="44" rx="9" fill="none" opacity="0.85" />
        <rect x="159" y="63" width="11" height="10" rx="2.5" fill="none" opacity="0.4" />
        <text
          x="146"
          y="83"
          fill="currentColor"
          stroke="none"
          fontFamily="Georgia, 'Times New Roman', serif"
          fontSize="20"
          textAnchor="middle"
          opacity="0.65"
        >
          ?
        </text>
        <line x1="132" y1="68" x2="125" y2="68" opacity="0.55" />
        <line x1="132" y1="82" x2="125" y2="82" opacity="0.55" />
      </g>
      {/* the one exposed severed contact — single brand-green accent */}
      <circle cx="93.5" cy="71" r="2.2" fill="var(--logo-mark)" stroke="none" />
    </svg>
  );
}

/** Shared centered shell so 404 and the error screen read as one family. */
function ErrorScreen({
  eyebrow,
  art,
  title,
  guidance,
  detail,
  actions,
}: {
  eyebrow: string;
  art: ReactNode;
  title: string;
  guidance: string;
  detail?: string;
  actions: ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-[calc(100dvh_-_var(--topbar-h)_-_3rem)] w-full max-w-2xl flex-col justify-center">
      <Card className="px-6 py-14 text-center sm:px-10 sm:py-16">
        <div className="mx-auto flex max-w-md flex-col items-center">
          {art}
          <div className="eyebrow mb-2 mt-8">{eyebrow}</div>
          <h1
            id="main-heading"
            tabIndex={-1}
            className="text-[length:var(--fs-display)] font-semibold leading-[var(--lh-display)] tracking-tight text-text outline-none"
          >
            {title}
          </h1>
          <p className="mt-2 text-[length:var(--fs-body)] text-text-secondary">{guidance}</p>
          {detail && (
            <p
              title={detail}
              className="mt-3 max-w-full truncate rounded-[var(--r-sm)] border border-border bg-surface-2 px-2.5 py-1 font-mono text-[length:var(--fs-micro)] text-text-tertiary"
            >
              {detail}
            </p>
          )}
          <div className="mt-7 flex flex-wrap items-center justify-center gap-2">{actions}</div>
        </div>
      </Card>
    </div>
  );
}

export function NotFoundScreen() {
  return (
    <ErrorScreen
      eyebrow="Error 404"
      art={<LostRouteArt className="h-auto w-[180px] text-text-tertiary" />}
      title="We couldn't find that screen"
      guidance="The page may have moved or the link is broken. Your workspace is still here — jump to any section from the sidebar, search, or head back to the dashboard."
      actions={
        <>
          <Link to="/" className={buttonClasses('primary', 'md')}>
            Back to dashboard
          </Link>
          <Button
            variant="secondary"
            leadingIcon={<Search className="h-4 w-4" />}
            onClick={() => window.dispatchEvent(new CustomEvent('acv:open-command-palette'))}
          >
            Search Acrivault
          </Button>
        </>
      }
    />
  );
}

/** Used as the router errorElement for unexpected route errors. */
export function RouteError() {
  const error = useRouteError();
  const status = isRouteErrorResponse(error) ? error.status : undefined;
  const detail = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : 'Unknown error';
  return (
    <ErrorScreen
      eyebrow={status ? `Error ${status}` : 'Error'}
      art={<SeveredLinkArt className="h-auto w-[190px] text-text-tertiary" />}
      title="Something went wrong"
      guidance="This screen hit an unexpected error. You can head back to the dashboard, or reload to try again."
      detail={detail}
      actions={
        <>
          <Link to="/" className={buttonClasses('primary', 'md')}>
            Back to dashboard
          </Link>
          <Button
            variant="secondary"
            leadingIcon={<RotateCw className="h-4 w-4" />}
            onClick={() => window.location.reload()}
          >
            Reload
          </Button>
        </>
      }
    />
  );
}
