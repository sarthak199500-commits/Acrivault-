import { useState, type ReactNode } from 'react';
import { ChevronDown, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { EntraChip, Path } from './parts';

/**
 * The Entra-side preamble: the steps that happen entirely in the Azure portal,
 * before any Acrivault field is involved. It sits in the card rather than in a
 * popover, because a popover covering the fields it describes is the one thing
 * guaranteed to be in the way.
 *
 * The copy/paste steps are deliberately NOT here — they live beside the fields
 * they act on, so each instruction is adjacent to the box it fills.
 */
export interface GuideStep {
  title: string;
  detail: ReactNode;
}

export function EntraGuide({
  title,
  steps,
  done,
  onDone,
}: {
  title: string;
  steps: GuideStep[];
  /** Once the admin is past the Entra portion this collapses to a single line. */
  done: boolean;
  onDone?: () => void;
}) {
  const [open, setOpen] = useState(!done);
  const minutes = Math.max(1, Math.round(steps.length * 0.75));

  return (
    <div className="rounded-[var(--r-md)] border border-border bg-surface-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 rounded-[var(--r-md)] px-3.5 py-2.5 text-left hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[color-mix(in_srgb,var(--accent)_35%,transparent)]"
      >
        <ExternalLink className="h-4 w-4 shrink-0 text-info-fg" aria-hidden="true" />
        <span className="min-w-0 flex-1 text-[length:var(--fs-small)] font-medium text-text">{title}</span>
        <span className="shrink-0 text-[length:var(--fs-micro)] text-text-tertiary">
          {steps.length} steps, about {minutes} min
        </span>
        <ChevronDown
          className={cn('h-4 w-4 shrink-0 text-text-tertiary transition-transform', open && 'rotate-180')}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div className="border-t border-border px-3.5 py-3">
          <ol className="space-y-3">
            {steps.map((step, i) => (
              <li key={step.title} className="flex gap-2.5">
                <span
                  aria-hidden="true"
                  className="tnum mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border-strong text-[length:var(--fs-micro)] text-accent-text"
                >
                  {i + 1}
                </span>
                <span className="min-w-0">
                  <span className="block text-[length:var(--fs-small)] font-medium text-text">{step.title}</span>
                  <span className="block text-[length:var(--fs-small)] text-text-secondary">{step.detail}</span>
                </span>
              </li>
            ))}
          </ol>
          {onDone && (
            <Button
              size="sm"
              variant="secondary"
              className="mt-3"
              onClick={() => {
                setOpen(false);
                onDone();
              }}
            >
              Done, I’m on that screen
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/** Steps 1–4 of the old Azure popover: everything before Acrivault is involved. */
export const SAML_GUIDE_STEPS: GuideStep[] = [
  {
    title: 'Open your Entra application list',
    detail: <Path steps={['Azure portal', 'Microsoft Entra ID', 'Enterprise applications', 'All applications']} />,
  },
  {
    title: 'Open the Acrivault application, or create one',
    detail: (
      <>
        If it already exists, open it and skip ahead. Otherwise{' '}
        <EntraChip>+ Create your own application</EntraChip>, give it a name, and choose{' '}
        <EntraChip>Integrate any other application you don’t find in the gallery</EntraChip>.
      </>
    ),
  },
  {
    title: 'Choose SAML',
    detail: <Path steps={['Manage', 'Single sign-on', 'the SAML tile']} />,
  },
  {
    title: 'Edit the Basic SAML Configuration',
    detail: (
      <>
        On <EntraChip>Set up Single Sign-On with SAML</EntraChip>, press Edit beside{' '}
        <EntraChip>Basic SAML Configuration</EntraChip>.
      </>
    ),
  },
];

/** The provisioning preamble, from the second Azure popover. */
export const SCIM_GUIDE_STEPS: GuideStep[] = [
  {
    title: 'Open Provisioning on the same application',
    detail: <Path steps={['your application', 'Manage', 'Provisioning']} />,
  },
  {
    title: 'Open the configuration, or create one',
    detail: (
      <>
        Edit the credentials on an existing configuration, or press{' '}
        <EntraChip>+ New configuration</EntraChip>. Set the authentication method to{' '}
        <EntraChip>Bearer authentication</EntraChip>.
      </>
    ),
  },
];
