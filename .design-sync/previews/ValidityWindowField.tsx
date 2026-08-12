import type { ReactNode } from 'react';
import { ValidityWindowField } from 'acrivault';

/* See Button.tsx for why scaffolding is inline-styled rather than class-based. */
function Frame({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        background: 'var(--bg)',
        borderRadius: 'var(--r-md)',
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 22,
      }}
    >
      {children}
    </div>
  );
}

/* The component owns its own legend — "Access window (optional)" — so there is
 * no label prop and no way to retitle it. Cells that need to say which case
 * they show carry a caption underneath instead. */
function Caption({ children }: { children: ReactNode }) {
  return <span style={{ fontSize: 'var(--fs-micro)', color: 'var(--text-tertiary)' }}>{children}</span>;
}

/** Both dates unset — the default, and the state that means "no window at all",
 *  not "a window that has not started". `undefined` and a pair of empty strings
 *  are the same thing to this component. */
export function Empty() {
  return (
    <Frame>
      <ValidityWindowField value={undefined} onChange={() => {}} />
      <Caption>No window set — access does not expire.</Caption>
    </Frame>
  );
}

/** A bounded window. Either bound may stand alone: a start with no expiry is
 *  scheduled-but-permanent access, an expiry with no start begins immediately. */
export function WithDates() {
  return (
    <Frame>
      <ValidityWindowField value={{ start: '2026-08-01', expiry: '2026-11-01' }} onChange={() => {}} />
      <Caption>Both bounds set — a three-month contractor window.</Caption>
      <ValidityWindowField value={{ expiry: '2026-09-30' }} onChange={() => {}} />
      <Caption>Expiry only — access starts immediately and lapses on the date.</Caption>
    </Frame>
  );
}

/** An expiry before the start is the one thing the field validates itself: the
 *  expiry input goes critical, gets aria-invalid, and the message below carries
 *  role=alert. */
export function InvalidRange() {
  return (
    <Frame>
      <ValidityWindowField value={{ start: '2026-11-01', expiry: '2026-08-01' }} onChange={() => {}} />
      <Caption>Expiry precedes start — only the expiry input is marked.</Caption>
    </Frame>
  );
}

/** Disabled dims both date inputs, for a window fixed by the invitation the
 *  admin is editing rather than by the admin. */
export function Disabled() {
  return (
    <Frame>
      <ValidityWindowField value={{ start: '2026-08-01', expiry: '2026-11-01' }} onChange={() => {}} disabled />
      <Caption>Window inherited from the invitation and not editable here.</Caption>
    </Frame>
  );
}
