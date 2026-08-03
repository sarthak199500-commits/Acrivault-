// Password policy — the single source of truth for both the UI checklist and the
// simulated backend validation in mocks/api.ts. Keeping one implementation means the
// checklist can never disagree with the error the "server" returns.

export const PASSWORD_MIN_LENGTH = 12;

export interface PasswordRule {
  id: string;
  /** Imperative label for the checklist, e.g. "At least 12 characters". */
  label: string;
  test: (value: string) => boolean;
}

export const PASSWORD_RULES: readonly PasswordRule[] = [
  {
    id: 'length',
    label: `At least ${PASSWORD_MIN_LENGTH} characters`,
    test: (v) => v.length >= PASSWORD_MIN_LENGTH,
  },
  { id: 'upper', label: 'One uppercase letter', test: (v) => /[A-Z]/.test(v) },
  { id: 'lower', label: 'One lowercase letter', test: (v) => /[a-z]/.test(v) },
  { id: 'digit', label: 'One number', test: (v) => /\d/.test(v) },
  {
    id: 'symbol',
    label: 'One symbol',
    // Anything that is not a letter, digit, or whitespace counts — narrowing the set
    // would reject legitimate passwords from non-US keyboard layouts.
    test: (v) => /[^A-Za-z0-9\s]/.test(v),
  },
];

/** Which rules the value satisfies, keyed by rule id. */
export function passwordChecks(value: string): Record<string, boolean> {
  return Object.fromEntries(PASSWORD_RULES.map((r) => [r.id, r.test(value)]));
}

/** True only when every rule passes. */
export function isPasswordValid(value: string): boolean {
  return PASSWORD_RULES.every((r) => r.test(value));
}

/**
 * Rules satisfied, for the strength meter. Deliberately a rule count rather than an
 * entropy estimate: the meter's job is to show progress toward *this* policy, and a
 * score the checklist contradicts would be worse than no score at all.
 */
export function passwordStrength(value: string): number {
  if (!value) return 0;
  return PASSWORD_RULES.filter((r) => r.test(value)).length;
}

export const PASSWORD_STRENGTH_MAX = PASSWORD_RULES.length;

/** The first unmet rule, phrased as a submit-time error. */
export function passwordError(value: string): string | undefined {
  const failed = PASSWORD_RULES.find((r) => !r.test(value));
  if (!failed) return undefined;
  return failed.id === 'length'
    ? `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`
    : `Password must include ${failed.label.replace(/^One /, '').toLowerCase()}.`;
}
