import type { ReactNode } from 'react';
import { CodeBlock } from 'acrivault';

/* See Button.tsx for why scaffolding is inline-styled rather than class-based. */
function Frame({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: 'var(--bg)', borderRadius: 'var(--r-md)', padding: 20, maxWidth: 560 }}>
      {children}
    </div>
  );
}

/** A labeled, read-only credential block — the component's main use.
 *
 *  The key pair is AWS's own documentation placeholder. Any other AKIA-shaped
 *  value, however synthetic, trips GitHub and AWS secret scanning; these two are
 *  published as examples and are allowlisted by scanners. */
export function Default() {
  return (
    <Frame>
      <CodeBlock
        label="Generated — read-only"
        code={'AKIAIOSFODNN7EXAMPLE\nwJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'}
      />
    </Frame>
  );
}

/** A single-line value. `label` is optional but never absent from the render —
 *  omitting it falls back to "Generated · read-only", so pass one whenever the
 *  default would be wrong. */
export function SingleLine() {
  return (
    <Frame>
      <CodeBlock code={'arn:aws:iam::402913857761:role/billing-worker'} />
    </Frame>
  );
}

/** Multi-line policy JSON — the long-content case. */
export function MultiLine() {
  return (
    <Frame>
      <CodeBlock
        label="Attached policy"
        code={[
          '{',
          '  "Version": "2012-10-17",',
          '  "Statement": [{',
          '    "Effect": "Allow",',
          '    "Action": ["s3:GetObject", "s3:PutObject"],',
          '    "Resource": "arn:aws:s3:::billing-exports/*"',
          '  }]',
          '}',
        ].join('\n')}
      />
    </Frame>
  );
}
