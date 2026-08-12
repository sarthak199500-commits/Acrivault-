import type { ReactNode } from 'react';
import { Slider } from 'acrivault';

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
        alignItems: 'stretch',
        gap: 18,
        maxWidth: 420,
      }}
    >
      {children}
    </div>
  );
}

/* The slider renders no value of its own — the caller owns the readout. This is
 * the header row the product pairs it with. */
function Field({ label, value, children }: { label: string; value: string; children: ReactNode }) {
  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 6,
          fontSize: 'var(--fs-small)',
          color: 'var(--text-secondary)',
        }}
      >
        <span>{label}</span>
        <span style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
      </div>
      {children}
    </div>
  );
}

/** The canonical pairing: a label, a live numeric readout, and the track. The
 *  filled portion left of the thumb uses `--accent`; the remainder is
 *  `--surface-2`. */
export function Default() {
  return (
    <Frame>
      <Field label="Risk threshold" value="72">
        <Slider value={72} onValueChange={() => {}} ariaLabel="Risk threshold" />
      </Field>
    </Frame>
  );
}

/** The fill across the range. At 0 the track reads as empty, at 100 as full —
 *  both ends are legible, which is what makes the control safe to use without a
 *  readout when the exact number does not matter. */
export function ValueRange() {
  return (
    <Frame>
      <Field label="Minimum severity to alert" value="0">
        <Slider value={0} onValueChange={() => {}} ariaLabel="Minimum severity, at zero" />
      </Field>
      <Field label="Minimum severity to alert" value="35">
        <Slider value={35} onValueChange={() => {}} ariaLabel="Minimum severity, low" />
      </Field>
      <Field label="Minimum severity to alert" value="70">
        <Slider value={70} onValueChange={() => {}} ariaLabel="Minimum severity, high" />
      </Field>
      <Field label="Minimum severity to alert" value="100">
        <Slider value={100} onValueChange={() => {}} ariaLabel="Minimum severity, at maximum" />
      </Field>
    </Frame>
  );
}

/** `min`, `max`, and `step` reshape the scale without changing the visuals —
 *  the track always spans the full width regardless of the underlying range. */
export function CustomRange() {
  return (
    <Frame>
      <Field label="Rotation interval" value="90 days">
        <Slider value={90} onValueChange={() => {}} min={30} max={365} step={30} ariaLabel="Rotation interval in days" />
      </Field>
      <Field label="Dormancy window" value="14 days">
        <Slider value={14} onValueChange={() => {}} min={1} max={30} step={1} ariaLabel="Dormancy window in days" />
      </Field>
    </Frame>
  );
}

/** Disabled drops the whole control to 50% — track, fill, and thumb together,
 *  so it never looks like a slider sitting at an unusual value. */
export function Disabled() {
  return (
    <Frame>
      <Field label="Risk threshold" value="40">
        <Slider value={40} onValueChange={() => {}} ariaLabel="Risk threshold" />
      </Field>
      <Field label="Risk threshold — locked by policy" value="40">
        <Slider value={40} onValueChange={() => {}} disabled ariaLabel="Risk threshold, locked by policy" />
      </Field>
    </Frame>
  );
}
