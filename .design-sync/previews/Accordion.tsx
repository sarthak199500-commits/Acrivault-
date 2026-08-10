import type { ReactNode } from 'react';
import { Accordion } from 'acrivault';

/* See Button.tsx for why scaffolding is inline-styled rather than class-based. */
function Frame({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: 'var(--bg)', borderRadius: 'var(--r-md)', padding: 20, maxWidth: 560 }}>
      {children}
    </div>
  );
}

const GLOSSARY = [
  {
    value: 'nhi',
    title: 'What counts as a non-human identity?',
    content:
      'Service accounts, static API keys, OAuth client credentials, workload identities, and autonomous AI agents — anything that authenticates without a person present.',
  },
  {
    value: 'orphaned',
    title: 'When is an identity orphaned?',
    content:
      'No named owner in the directory, or no legitimate use in the last 90 days. Orphaned credentials are treated as first-class high-risk findings, not as cleanup chores.',
  },
  {
    value: 'blast-radius',
    title: 'How is blast radius calculated?',
    content:
      'Every resource the identity can reach by direct grant, transitive role assumption, or cascade through a secondary credential it can read.',
  },
];

/** The default form: `type="single"` and collapsible, with the first panel opened
 *  via `defaultValue`. Only one panel can be open at a time. */
export function Default() {
  return (
    <Frame>
      <Accordion defaultValue="nhi" items={GLOSSARY} />
    </Frame>
  );
}

/** No `defaultValue` — every panel starts closed. The resting state for optional
 *  settings, where the headers act as a scannable index. */
export function AllCollapsed() {
  return (
    <Frame>
      <Accordion items={GLOSSARY} />
    </Frame>
  );
}

/** `type="multiple"` lets panels stay open independently instead of closing each
 *  other. Panel content is arbitrary nodes, not just prose. */
export function MultipleWithRichContent() {
  return (
    <Frame>
      <Accordion
        type="multiple"
        defaultValue="scope"
        items={[
          {
            value: 'scope',
            title: 'Permissions granted to payments-api@acrivault',
            content: (
              <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <li>s3:GetObject on arn:aws:s3:::acv-billing-exports/*</li>
                <li>secretsmanager:GetSecretValue on 4 secrets</li>
                <li>sts:AssumeRole on arn:aws:iam::4471:role/billing-reconciler</li>
              </ul>
            ),
          },
          {
            value: 'rotation',
            title: 'Rotation window',
            content: 'Automated rotation runs Sundays 02:00–04:00 UTC. Last successful rotation 41 days ago.',
          },
          {
            value: 'exceptions',
            title: 'Policy exceptions',
            content: 'One standing exception: max key age raised from 90 to 120 days, approved by the platform team.',
          },
        ]}
      />
    </Frame>
  );
}
