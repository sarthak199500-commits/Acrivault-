import { describe, expect, it } from 'vitest';
import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_STRENGTH_MAX,
  isPasswordValid,
  passwordChecks,
  passwordError,
  passwordStrength,
} from './password';

/** Satisfies every rule: 12+ chars, upper, lower, digit, symbol. */
const STRONG = 'Vault-Keeper9!';

describe('isPasswordValid', () => {
  it('accepts a password meeting every rule', () => {
    expect(isPasswordValid(STRONG)).toBe(true);
  });

  it('rejects at one character below the minimum length', () => {
    // 11 chars, otherwise complete — isolates the length rule at its boundary.
    const short = 'Vault-Kee9!';
    expect(short).toHaveLength(PASSWORD_MIN_LENGTH - 1);
    expect(isPasswordValid(short)).toBe(false);
    expect(isPasswordValid(`${short}x`)).toBe(true);
  });

  it.each([
    ['no uppercase', 'vault-keeper9!'],
    ['no lowercase', 'VAULT-KEEPER9!'],
    ['no digit', 'Vault-Keeper!!'],
    ['no symbol', 'VaultKeeper999'],
  ])('rejects a long password with %s', (_label, value) => {
    expect(value.length).toBeGreaterThanOrEqual(PASSWORD_MIN_LENGTH);
    expect(isPasswordValid(value)).toBe(false);
  });

  it('rejects the empty string', () => {
    expect(isPasswordValid('')).toBe(false);
  });

  it('counts any non-alphanumeric as a symbol, including non-US-keyboard characters', () => {
    expect(isPasswordValid('VaultKeeper9£')).toBe(true);
  });

  it('does not accept whitespace as the symbol', () => {
    expect(passwordChecks('Vault Keeper9').symbol).toBe(false);
  });
});

describe('passwordStrength', () => {
  it('scores an empty password zero and a complete one at the maximum', () => {
    expect(passwordStrength('')).toBe(0);
    expect(passwordStrength(STRONG)).toBe(PASSWORD_STRENGTH_MAX);
  });

  it('rises as rules are met', () => {
    // lower only → +upper → +digit → +symbol (all still under the length minimum)
    expect(passwordStrength('vault')).toBe(1);
    expect(passwordStrength('Vault')).toBe(2);
    expect(passwordStrength('Vault9')).toBe(3);
    expect(passwordStrength('Vault9!')).toBe(4);
  });

  it('never reports maximum strength for a password the policy rejects', () => {
    const shortButComplete = 'Va9!';
    expect(isPasswordValid(shortButComplete)).toBe(false);
    expect(passwordStrength(shortButComplete)).toBeLessThan(PASSWORD_STRENGTH_MAX);
  });
});

describe('passwordError', () => {
  it('returns undefined for a valid password', () => {
    expect(passwordError(STRONG)).toBeUndefined();
  });

  it('reports length before the character-class rules', () => {
    expect(passwordError('Va9!')).toBe(
      `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`,
    );
  });

  it('names the missing character class once length is satisfied', () => {
    expect(passwordError('vault-keeper9!')).toBe('Password must include uppercase letter.');
    expect(passwordError('VaultKeeper999')).toBe('Password must include symbol.');
  });
});
