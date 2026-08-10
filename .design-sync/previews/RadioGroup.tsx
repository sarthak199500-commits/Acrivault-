import type { ReactNode } from 'react';
import { RadioGroup } from 'acrivault';

/* See Button.tsx for why scaffolding is inline-styled rather than class-based. */
function Frame({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        background: 'var(--bg)',
        borderRadius: 'var(--r-md)',
        padding: 20,
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'flex-start',
        gap: 32,
      }}
    >
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 260 }}>
      <span style={{ fontSize: 'var(--fs-small)', fontWeight: 500, color: 'var(--text-secondary)' }}>{label}</span>
      {children}
    </div>
  );
}

/** The canonical form: one choice, each option carrying a description that says
 *  what picking it actually does. The third option is disabled, which dims the
 *  whole row — label and description together — not just the dot. */
export function Default() {
  return (
    <Frame>
      <Field label="Rotation mode">
        <RadioGroup
          value="standard"
          onValueChange={() => {}}
          ariaLabel="Rotation mode"
          options={[
            { value: 'standard', label: 'Standard rotation', description: 'Zero-downtime, on the policy schedule.' },
            { value: 'emergency', label: 'Emergency rotation', description: 'Revokes the old key immediately.' },
            { value: 'scheduled', label: 'Scheduled rotation', description: 'Unavailable on this plan.', disabled: true },
          ]}
        />
      </Field>
    </Frame>
  );
}

/** Descriptions are optional. Without them the group collapses to a tight list —
 *  right when the labels are self-explanatory and the group is one of several
 *  on a settings page. */
export function WithoutDescriptions() {
  return (
    <Frame>
      <Field label="Scan depth">
        <RadioGroup
          value="full"
          onValueChange={() => {}}
          ariaLabel="Scan depth"
          options={[
            { value: 'metadata', label: 'Metadata only' },
            { value: 'full', label: 'Full inventory' },
            { value: 'deep', label: 'Full inventory + permission graph' },
          ]}
        />
      </Field>
    </Frame>
  );
}

/** `orientation="horizontal"` lays the options out in a wrapping row. Use it
 *  only for two or three short labels — descriptions do not survive the
 *  narrower column. */
export function Horizontal() {
  return (
    <Frame>
      <Field label="Apply rotation to">
        <RadioGroup
          value="selected"
          onValueChange={() => {}}
          ariaLabel="Apply rotation to"
          orientation="horizontal"
          options={[
            { value: 'selected', label: 'Selected identities' },
            { value: 'account', label: 'Whole account' },
            { value: 'org', label: 'Organization' },
          ]}
        />
      </Field>
    </Frame>
  );
}
