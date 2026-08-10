import type { ReactNode } from 'react';
import { CodeInput } from 'acrivault';

/* See Button.tsx for why scaffolding is inline-styled rather than class-based.
 *
 * `autoFocusFirst` is deliberately never passed here — it steals focus on mount,
 * which is right in the real verification flow and wrong in a preview grid. */
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

/** Empty, awaiting entry — how the field looks the moment the verification
 *  screen mounts. Six boxes, each one digit, at display type size. */
export function Default() {
  return (
    <Frame>
      <CodeInput label="Verification code" value="" onChange={() => {}} />
    </Frame>
  );
}

/** Partially and fully entered. Digits are tabular-figure so the boxes stay
 *  optically even regardless of which numerals land in them. */
export function Filled() {
  return (
    <Frame>
      <CodeInput label="Verification code — partially entered" value="418" onChange={() => {}} />
      <CodeInput label="Verification code — complete" value="418302" onChange={() => {}} />
    </Frame>
  );
}

/** `error` turns every box's border critical and prints the message below with
 *  role=alert. Validity is never signalled by colour alone — the message is the
 *  thing that carries it. */
export function ErrorState() {
  return (
    <Frame>
      <CodeInput
        label="Verification code"
        value="418302"
        onChange={() => {}}
        error="That code is incorrect or has expired. Request a new one."
      />
    </Frame>
  );
}

/** `length` sets the box count — 6 for email verification, 8 for a recovery
 *  code. Disabled dims the whole group while a submission is in flight. */
export function LengthAndDisabled() {
  return (
    <Frame>
      <CodeInput label="Recovery code (8 digits)" length={8} value="90417" onChange={() => {}} />
      <CodeInput label="Verification code — submitting" value="418302" onChange={() => {}} disabled />
    </Frame>
  );
}
