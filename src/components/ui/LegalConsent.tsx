import type { LegalDocs } from '@/mocks/api';
import { Checkbox } from './Checkbox';

export interface Consents {
  tos: boolean;
  dpa: boolean;
}

function DocReader({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h2 className="mb-1.5 text-[length:var(--fs-small)] font-semibold text-text">{title}</h2>
      <div
        // A scrollable region must be keyboard-focusable so its content is reachable.
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
        tabIndex={0}
        role="region"
        aria-label={title}
        className="h-32 overflow-y-auto whitespace-pre-line rounded-[var(--r-md)] border border-border bg-surface-2 p-3 text-[length:var(--fs-small)] leading-[var(--lh-small)] text-text-secondary outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--accent)_30%,transparent)]"
      >
        {body}
      </div>
    </div>
  );
}

/**
 * The Terms of Service + Data Processing Agreement reader with the two required
 * consent checkboxes. The gated primary action lives on the screen and is enabled
 * only when both are checked.
 */
export function LegalConsent({
  docs,
  consents,
  onChange,
  disabled,
}: {
  docs: LegalDocs;
  consents: Consents;
  onChange: (next: Consents) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-4">
      <DocReader title="Terms of Service" body={docs.tos} />
      <DocReader title="Data Processing Agreement" body={docs.dpa} />

      <div className="space-y-2.5">
        <label className="flex items-start gap-2.5 text-[length:var(--fs-small)] text-text-secondary">
          <Checkbox
            checked={consents.tos}
            onCheckedChange={(v) => onChange({ ...consents, tos: v })}
            disabled={disabled}
            aria-label="I agree to the Terms of Service"
          />
          <span>I have read and agree to the <span className="text-text">Terms of Service</span>.</span>
        </label>
        <label className="flex items-start gap-2.5 text-[length:var(--fs-small)] text-text-secondary">
          <Checkbox
            checked={consents.dpa}
            onCheckedChange={(v) => onChange({ ...consents, dpa: v })}
            disabled={disabled}
            aria-label="I agree to the Data Processing Agreement"
          />
          <span>I have read and agree to the <span className="text-text">Data Processing Agreement</span>.</span>
        </label>
      </div>
    </div>
  );
}
