import type { ReactNode } from 'react';
import { Stepper } from 'acrivault';

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
        gap: 8,
      }}
    >
      {children}
    </div>
  );
}

function Caption({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        color: 'var(--text-tertiary)',
        fontSize: 'var(--fs-micro)',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
      }}
    >
      {children}
    </span>
  );
}

const ONBOARDING = [
  { id: 'connect', label: 'Connect' },
  { id: 'scan', label: 'Scan' },
  { id: 'review', label: 'Review' },
];

/** The onboarding flow mid-way: step one is done (filled + check), step two is
 *  current (accent ring), step three is upcoming (muted). */
export function Default() {
  return (
    <Frame>
      <Caption>Onboarding · scanning</Caption>
      <Stepper steps={ONBOARDING} current={1} />
    </Frame>
  );
}

/** Start of the flow — nothing completed yet, both connectors ahead are muted. */
export function FirstStep() {
  return (
    <Frame>
      <Caption>Onboarding · connect your clouds</Caption>
      <Stepper steps={ONBOARDING} current={0} />
    </Frame>
  );
}

/** `currentComplete` marks the active step finished without advancing — used
 *  when a scan has finished but its results are still on screen. */
export function CurrentComplete() {
  return (
    <Frame>
      <Caption>Scan finished, results still shown</Caption>
      <Stepper steps={ONBOARDING} current={1} currentComplete />
    </Frame>
  );
}

/** A five-step flow on its final step: four completed connectors behind it. */
export function LastStepOfMany() {
  return (
    <Frame>
      <Caption>Credential rotation · verify</Caption>
      <Stepper
        steps={[
          { id: 'stage', label: 'Stage' },
          { id: 'issue', label: 'Issue' },
          { id: 'propagate', label: 'Propagate' },
          { id: 'cutover', label: 'Cutover' },
          { id: 'verify', label: 'Verify' },
        ]}
        current={4}
      />
    </Frame>
  );
}
