import { useState } from 'react';
import type { ReactNode } from 'react';
import { MfaChallenge } from 'acrivault';

/* MfaChallenge is the per-sign-in step: instructional copy plus a 6-box CodeInput
 * with retry. It is controlled — code + onCodeChange — and takes an `error` string
 * and a `verifying` flag. */
function Frame({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: 'var(--bg)', borderRadius: 'var(--r-md)', padding: 24, display: 'flex', flexWrap: 'wrap', gap: 24 }}>
      {children}
    </div>
  );
}

function Cell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: 340 }}>
      <span style={{ textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: 'var(--fs-micro)', color: 'var(--text-tertiary)' }}>{label}</span>
      {children}
    </div>
  );
}

/** A partially-entered challenge, and the rejected-code error state. */
export function EntryAndError() {
  const [code, setCode] = useState('418');
  const [bad, setBad] = useState('418302');
  return (
    <Frame>
      <Cell label="Entering">
        <MfaChallenge code={code} onCodeChange={setCode} />
      </Cell>
      <Cell label="Rejected">
        <MfaChallenge code={bad} onCodeChange={setBad} error="That code didn't match. Try the current one from your app." />
      </Cell>
    </Frame>
  );
}
